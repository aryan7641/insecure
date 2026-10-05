from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Callable, TypeVar

T = TypeVar("T")


@dataclass
class _Call:
    event: threading.Event
    result: object | None = None
    error: BaseException | None = None


class SingleFlight:
    """Collapse concurrent identical work into one execution.

    This prevents a burst of identical uploads from multiplying expensive LLM calls.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._calls: dict[str, _Call] = {}

    def run(self, key: str, fn: Callable[[], T]) -> T:
        with self._lock:
            call = self._calls.get(key)
            if call is None:
                call = _Call(event=threading.Event())
                self._calls[key] = call
                leader = True
            else:
                leader = False

        if not leader:
            call.event.wait()
            if call.error is not None:
                raise call.error
            return call.result  # type: ignore[return-value]

        try:
            call.result = fn()
            return call.result  # type: ignore[return-value]
        except BaseException as exc:  # noqa: BLE001
            call.error = exc
            raise
        finally:
            call.event.set()
            with self._lock:
                self._calls.pop(key, None)


SINGLE_FLIGHT = SingleFlight()

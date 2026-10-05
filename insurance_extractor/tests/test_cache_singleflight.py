import time
from insurance_extractor.cache import TTLCache
from insurance_extractor.singleflight import SingleFlight
from insurance_extractor.models import ExtractionEnvelope, MotorExtraction, MotorVehicle, MotorPolicy, MotorPremium, InsuredCustomer, Nominee, PaymentDetails


def test_ttl_cache_set_get():
    cache = TTLCache(max_entries=5, ttl_seconds=60)
    data = {"key": "value"}
    cache.set("doc_1", data)
    assert cache.get("doc_1") == data
    assert cache.get("non_existent") is None


def test_ttl_cache_eviction():
    cache = TTLCache(max_entries=2, ttl_seconds=60)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    assert cache.get("a") is None
    assert cache.get("b") == 2
    assert cache.get("c") == 3


def test_singleflight_deduplication():
    sf = SingleFlight()
    call_count = 0

    def expensive_work():
        nonlocal call_count
        call_count += 1
        time.sleep(0.05)
        return "result"

    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(sf.run, "flight_key", expensive_work) for _ in range(5)]
        results = [f.result() for f in futures]

    assert all(r == "result" for r in results)
    assert call_count == 1

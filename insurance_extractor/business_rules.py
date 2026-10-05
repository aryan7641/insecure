from __future__ import annotations

# Standard Indian motor insurance territory-zone mapping used by many motor products.
# Keep this configuration isolated so an insurer-specific zone matrix can replace it later.
ZONE_A_CITIES = {
    "ahmedabad", "bengaluru", "bangalore", "chennai", "hyderabad", "kolkata",
    "mumbai", "new delhi", "delhi", "pune",
}

STATE_NAMES = {
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat",
    "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra",
    "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
    "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal", "delhi", "jammu and kashmir",
    "ladakh", "chandigarh", "puducherry",
}


def motor_zone_for_city(city: str | None) -> str | None:
    if not city:
        return None
    return "A" if city.strip().lower() in ZONE_A_CITIES else "B"

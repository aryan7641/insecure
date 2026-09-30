from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

SourceType = Literal["document", "derived", "not_found"]


class Evidence(BaseModel):
    page: int = Field(ge=1)
    quote: str = Field(min_length=1, max_length=500)


class Conflict(BaseModel):
    field: str
    values: List[str]
    pages: List[int] = Field(default_factory=list)
    explanation: str


class ExtractedField(BaseModel):
    """A UI-ready value plus provenance and quality metadata."""

    model_config = ConfigDict(extra="forbid")

    value: Optional[str] = None
    raw_value: Optional[str] = None
    source: SourceType = "not_found"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence: List[Evidence] = Field(default_factory=list)
    requires_review: bool = False
    notes: Optional[str] = None


class AddOn(BaseModel):
    name: str
    selected: bool
    premium: Optional[str] = None
    evidence: List[Evidence] = Field(default_factory=list)


class OptionalCover(BaseModel):
    name: str
    selected: Optional[bool] = None
    option: Optional[str] = None
    value: Optional[str] = None
    evidence: List[Evidence] = Field(default_factory=list)


class Rider(BaseModel):
    package_name: Optional[str] = None
    rider_name: str
    selected: Optional[bool] = None
    coverage_limit: Optional[str] = None
    applicable_members: List[str] = Field(default_factory=list)
    evidence: List[Evidence] = Field(default_factory=list)


class Nominee(BaseModel):
    name: ExtractedField = Field(default_factory=ExtractedField)
    dob: ExtractedField = Field(default_factory=ExtractedField)
    relationship: ExtractedField = Field(default_factory=ExtractedField)
    share_percent: ExtractedField = Field(default_factory=ExtractedField)
    address: ExtractedField = Field(default_factory=ExtractedField)
    mobile: ExtractedField = Field(default_factory=ExtractedField)
    email: ExtractedField = Field(default_factory=ExtractedField)


class PaymentDetails(BaseModel):
    status: ExtractedField = Field(default_factory=ExtractedField)
    mode: ExtractedField = Field(default_factory=ExtractedField)
    payer_name: ExtractedField = Field(default_factory=ExtractedField)
    amount_paid: ExtractedField = Field(default_factory=ExtractedField)
    receipt_number: ExtractedField = Field(default_factory=ExtractedField)
    receipt_date: ExtractedField = Field(default_factory=ExtractedField)


class MotorVehicle(BaseModel):
    type_of_vehicle: ExtractedField = Field(default_factory=ExtractedField)
    vehicle_category: ExtractedField = Field(default_factory=ExtractedField)
    make: ExtractedField = Field(default_factory=ExtractedField)
    model: ExtractedField = Field(default_factory=ExtractedField)
    variant: ExtractedField = Field(default_factory=ExtractedField)
    fuel_type: ExtractedField = Field(default_factory=ExtractedField)
    cubic_capacity: ExtractedField = Field(default_factory=ExtractedField)
    seats_including_driver: ExtractedField = Field(default_factory=ExtractedField)
    registration_no: ExtractedField = Field(default_factory=ExtractedField)
    zone: ExtractedField = Field(default_factory=ExtractedField)
    registration_date: ExtractedField = Field(default_factory=ExtractedField)
    mfg_month: ExtractedField = Field(default_factory=ExtractedField)
    mfg_year: ExtractedField = Field(default_factory=ExtractedField)
    engine_no: ExtractedField = Field(default_factory=ExtractedField)
    chassis_no: ExtractedField = Field(default_factory=ExtractedField)
    vehicle_color: ExtractedField = Field(default_factory=ExtractedField)
    number_of_tire: ExtractedField = Field(default_factory=ExtractedField)
    financier: ExtractedField = Field(default_factory=ExtractedField)
    financed: ExtractedField = Field(default_factory=ExtractedField)
    previous_policy_available: ExtractedField = Field(default_factory=ExtractedField)


class MotorPolicy(BaseModel):
    insurer_name: ExtractedField = Field(default_factory=ExtractedField)
    policy_type: ExtractedField = Field(default_factory=ExtractedField)
    policy_number: ExtractedField = Field(default_factory=ExtractedField)
    policy_issue_date: ExtractedField = Field(default_factory=ExtractedField)
    policy_start_date: ExtractedField = Field(default_factory=ExtractedField)
    policy_end_date: ExtractedField = Field(default_factory=ExtractedField)
    idv_sum_assured: ExtractedField = Field(default_factory=ExtractedField)
    current_ncb: ExtractedField = Field(default_factory=ExtractedField)
    active_tp_insurer_name: ExtractedField = Field(default_factory=ExtractedField)
    active_tp_policy_number: ExtractedField = Field(default_factory=ExtractedField)
    active_tp_policy_start_date: ExtractedField = Field(default_factory=ExtractedField)
    active_tp_policy_end_date: ExtractedField = Field(default_factory=ExtractedField)
    financed: ExtractedField = Field(default_factory=ExtractedField)
    financed_by: ExtractedField = Field(default_factory=ExtractedField)
    add_ons: List[AddOn] = Field(default_factory=list)


class MotorPremium(BaseModel):
    od_premium: ExtractedField = Field(default_factory=ExtractedField)
    net_premium: ExtractedField = Field(default_factory=ExtractedField)
    gst_cess: ExtractedField = Field(default_factory=ExtractedField)
    final_premium: ExtractedField = Field(default_factory=ExtractedField)


class InsuredCustomer(BaseModel):
    customer_type: ExtractedField = Field(default_factory=ExtractedField)
    title: ExtractedField = Field(default_factory=ExtractedField)
    name: ExtractedField = Field(default_factory=ExtractedField)
    mobile: ExtractedField = Field(default_factory=ExtractedField)
    email: ExtractedField = Field(default_factory=ExtractedField)
    dob: ExtractedField = Field(default_factory=ExtractedField)
    pan: ExtractedField = Field(default_factory=ExtractedField)
    aadhaar: ExtractedField = Field(default_factory=ExtractedField)
    gst_number: ExtractedField = Field(default_factory=ExtractedField)
    address: ExtractedField = Field(default_factory=ExtractedField)
    pincode: ExtractedField = Field(default_factory=ExtractedField)
    city_district: ExtractedField = Field(default_factory=ExtractedField)
    state: ExtractedField = Field(default_factory=ExtractedField)


class HealthMember(BaseModel):
    member_id: ExtractedField = Field(default_factory=ExtractedField)
    name: ExtractedField = Field(default_factory=ExtractedField)
    gender: ExtractedField = Field(default_factory=ExtractedField)
    relationship: ExtractedField = Field(default_factory=ExtractedField)
    dob: ExtractedField = Field(default_factory=ExtractedField)
    age: ExtractedField = Field(default_factory=ExtractedField)
    insured_since: ExtractedField = Field(default_factory=ExtractedField)
    height_cm: ExtractedField = Field(default_factory=ExtractedField)
    weight_kg: ExtractedField = Field(default_factory=ExtractedField)
    abha_no: ExtractedField = Field(default_factory=ExtractedField)
    sum_insured: ExtractedField = Field(default_factory=ExtractedField)
    aggregate_deductible: ExtractedField = Field(default_factory=ExtractedField)
    maternity_care: ExtractedField = Field(default_factory=ExtractedField)
    reduction_maternity_waiting_period: ExtractedField = Field(default_factory=ExtractedField)


class MedicalQuestion(BaseModel):
    question_id: str
    question: str
    answers_by_member: List[ExtractedField] = Field(default_factory=list)
    details: Optional[str] = None
    evidence: List[Evidence] = Field(default_factory=list)


class PreviousHealthPolicy(BaseModel):
    insurer_name: ExtractedField = Field(default_factory=ExtractedField)
    policy_number: ExtractedField = Field(default_factory=ExtractedField)
    continuously_insured_since: ExtractedField = Field(default_factory=ExtractedField)
    portability_requested: ExtractedField = Field(default_factory=ExtractedField)


class HealthBasicDetails(BaseModel):
    lob_category: ExtractedField = Field(default_factory=ExtractedField)
    sub_lob_category: ExtractedField = Field(default_factory=ExtractedField)
    business_type: ExtractedField = Field(default_factory=ExtractedField)
    policy_type: ExtractedField = Field(default_factory=ExtractedField)
    senior_citizen_policy: ExtractedField = Field(default_factory=ExtractedField)
    number_of_adult: ExtractedField = Field(default_factory=ExtractedField)
    number_of_child: ExtractedField = Field(default_factory=ExtractedField)
    number_of_parent: ExtractedField = Field(default_factory=ExtractedField)
    eldest_person_age_type: ExtractedField = Field(default_factory=ExtractedField)
    eldest_person_dob: ExtractedField = Field(default_factory=ExtractedField)
    treatment_zone: ExtractedField = Field(default_factory=ExtractedField)
    ped: ExtractedField = Field(default_factory=ExtractedField)
    previous_policy_available: ExtractedField = Field(default_factory=ExtractedField)


class HealthPolicy(BaseModel):
    insurer_name: ExtractedField = Field(default_factory=ExtractedField)
    plan_name: ExtractedField = Field(default_factory=ExtractedField)
    policy_number: ExtractedField = Field(default_factory=ExtractedField)
    policy_tenure: ExtractedField = Field(default_factory=ExtractedField)
    policy_issue_date: ExtractedField = Field(default_factory=ExtractedField)
    policy_start_date: ExtractedField = Field(default_factory=ExtractedField)
    policy_end_date: ExtractedField = Field(default_factory=ExtractedField)
    base_sum_assured: ExtractedField = Field(default_factory=ExtractedField)
    bonus_sum_assured: ExtractedField = Field(default_factory=ExtractedField)
    total_sum_assured: ExtractedField = Field(default_factory=ExtractedField)
    ppt: ExtractedField = Field(default_factory=ExtractedField)
    renewal: ExtractedField = Field(default_factory=ExtractedField)
    ppm_frequency: ExtractedField = Field(default_factory=ExtractedField)
    optional_covers: List[OptionalCover] = Field(default_factory=list)
    riders: List[Rider] = Field(default_factory=list)
    previous_policies: List[PreviousHealthPolicy] = Field(default_factory=list)


class HealthPremium(BaseModel):
    basic_premium: ExtractedField = Field(default_factory=ExtractedField)
    other_premium: ExtractedField = Field(default_factory=ExtractedField)
    net_premium: ExtractedField = Field(default_factory=ExtractedField)
    gst_percent: ExtractedField = Field(default_factory=ExtractedField)
    final_premium: ExtractedField = Field(default_factory=ExtractedField)
    installment_amount: ExtractedField = Field(default_factory=ExtractedField)
    number_of_installment: ExtractedField = Field(default_factory=ExtractedField)
    initial_installment: ExtractedField = Field(default_factory=ExtractedField)
    initial_received_amount: ExtractedField = Field(default_factory=ExtractedField)


class MotorExtraction(BaseModel):
    vehicle: MotorVehicle
    policy: MotorPolicy
    premium: MotorPremium
    insured_customer: InsuredCustomer
    nominee: Nominee
    payment: PaymentDetails


class HealthExtraction(BaseModel):
    basic_details: HealthBasicDetails
    policy: HealthPolicy
    insured_customer: InsuredCustomer
    members: List[HealthMember] = Field(default_factory=list)
    nominee: Nominee
    premium: HealthPremium
    payment: PaymentDetails
    medical_questions: List[MedicalQuestion] = Field(default_factory=list)


class ExtractionEnvelope(BaseModel):
    """Model-facing envelope. Policy-type payloads are kept separate to avoid giant, ambiguous schemas."""
    document_type: Literal["motor", "health"]
    document_type_confidence: float = Field(ge=0.0, le=1.0)
    motor: Optional[MotorExtraction] = None
    health: Optional[HealthExtraction] = None
    global_conflicts: List[Conflict] = Field(default_factory=list)
    global_notes: List[str] = Field(default_factory=list)


class PageText(BaseModel):
    page: int
    text: str


class ExtractionResponse(BaseModel):
    request_id: str
    result: ExtractionEnvelope
    ui_payload: dict
    review_required: bool

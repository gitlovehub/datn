import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import { fetchApi, newIdempotencyKey } from "../../services/api";
import { SERVICE_PRODUCTS, type ServiceProduct } from "../../services/serviceCatalog";

type SavedVehicle = {
  id: number;
  license_plate: string | null;
  variant: string | null;
  year: number | null;
  model?: { name: string; brand?: { name: string } } | null;
};

const GARAGE_BRANCHES = [
  {
    id: "branch-cau-giay",
    name: "Cơ sở Cầu Giấy",
    fullName: "CarService Cầu Giấy (36 Dịch Vọng Hậu)",
    address: "Số 36 Phố Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    status: "Còn chỗ",
  },
];

const MORNING_SLOTS = ["08:00", "09:00", "09:30", "10:30", "11:15"];
const AFTERNOON_SLOTS = ["13:30", "14:15", "15:00", "16:00", "16:45"];

// Danh mục dòng xe chuẩn theo từng hãng xe ô tô
const BRAND_MODELS: Record<string, string[]> = {
  Toyota: [
    "Vios",
    "Camry",
    "Corolla Altis",
    "Corolla Cross",
    "Raize",
    "Fortuner",
    "Innova",
    "Innova Cross",
    "Hilux",
    "Yaris Cross",
    "Veloz Cross",
    "Avanza Premio",
    "Land Cruiser Prado",
    "Land Cruiser",
    "Wigo",
  ],
  Honda: [
    "City",
    "Civic",
    "CR-V",
    "HR-V",
    "BR-V",
    "Accord",
    "Brio",
  ],
  Hyundai: [
    "Accent",
    "Grand i10",
    "Elantra",
    "Creta",
    "Tucson",
    "Santa Fe",
    "Custin",
    "Palisade",
    "Stargazer",
    "Venue",
  ],
  Kia: [
    "Morning",
    "Soluto",
    "K3",
    "K5",
    "Sonet",
    "Seltos",
    "Carens",
    "Sportage",
    "Sorento",
    "Carnival",
  ],
  Mazda: [
    "Mazda 2",
    "Mazda 3",
    "Mazda 6",
    "CX-3",
    "CX-30",
    "CX-5",
    "CX-8",
    "BT-50",
  ],
  Ford: [
    "Ranger",
    "Everest",
    "Territory",
    "Explorer",
    "Ranger Raptor",
    "Transit",
  ],
  VinFast: [
    "Fadil",
    "Lux A2.0",
    "Lux SA2.0",
    "President",
    "VF 3",
    "VF 5",
    "VF 6",
    "VF 7",
    "VF 8",
    "VF 9",
    "VF e34",
  ],
  Mitsubishi: [
    "Xpander",
    "Xforce",
    "Outlander",
    "Pajero Sport",
    "Triton",
    "Attrage",
  ],
  "Mercedes-Benz": [
    "C-Class (C200, C300)",
    "E-Class (E200, E300)",
    "S-Class (S450)",
    "GLC (GLC 200, GLC 300)",
    "GLE",
    "GLS",
    "Maybach",
  ],
  BMW: [
    "3 Series (320i, 330i)",
    "5 Series (520i, 530i)",
    "7 Series",
    "X1",
    "X3",
    "X5",
    "X7",
  ],
  "Hãng khác": ["Dòng xe khác"],
};

type VehicleType = "Sedan / Hatchback (4-5 chỗ)" | "SUV / Crossover (5-7 chỗ)" | "Bán tải / MPV (7-8 chỗ)";

const VEHICLE_MODELS_BY_TYPE: Record<VehicleType, string[]> = {
  "Sedan / Hatchback (4-5 chỗ)": [
    "Vios", "Camry", "Corolla Altis", "Wigo", "City", "Civic", "Accord", "Brio",
    "Accent", "Grand i10", "Elantra", "Morning", "Soluto", "K3", "K5", "Mazda 2",
    "Mazda 3", "Mazda 6", "Fadil", "Lux A2.0", "Attrage", "C-Class (C200, C300)",
    "E-Class (E200, E300)", "S-Class (S450)", "3 Series (320i, 330i)",
    "5 Series (520i, 530i)", "7 Series", "Maybach",
  ],
  "SUV / Crossover (5-7 chỗ)": [
    "Corolla Cross", "Raize", "Fortuner", "Yaris Cross", "Land Cruiser Prado", "Land Cruiser",
    "CR-V", "HR-V", "Creta",
    "Tucson", "Santa Fe", "Palisade", "Venue", "Sonet", "Seltos", "Sportage", "Sorento",
    "CX-3", "CX-30", "CX-5", "CX-8", "Everest", "Territory", "Explorer", "Lux SA2.0",
    "President", "VF 3", "VF 5", "VF 6", "VF 7", "VF 8", "VF 9", "VF e34", "Xforce",
    "Outlander", "Pajero Sport", "GLC (GLC 200, GLC 300)", "GLE", "GLS", "X1", "X3", "X5", "X7",
  ],
  "Bán tải / MPV (7-8 chỗ)": [
    "Innova", "Innova Cross", "Hilux", "Veloz Cross", "Avanza Premio", "BR-V", "Custin",
    "Stargazer", "Carens", "Carnival", "BT-50", "Ranger",
    "Ranger Raptor", "Transit", "Xpander", "Triton",
  ],
};

function getVehicleTypeForModel(model: string): VehicleType | undefined {
  return (Object.entries(VEHICLE_MODELS_BY_TYPE) as [VehicleType, string[]][])
    .find(([, models]) => models.includes(model))?.[0];
}

function getModelsForVehicleType(brand: string, vehicleType: VehicleType): string[] {
  return (BRAND_MODELS[brand] || []).filter(
    (model) => getVehicleTypeForModel(model) === vehicleType || model === "Dòng xe khác",
  );
}

function getBrandForModel(model: string): string | undefined {
  return Object.entries(BRAND_MODELS).find(
    ([brand, models]) => brand !== "Hãng khác" && models.includes(model),
  )?.[0];
}

// Tự động format biển số xe theo chuẩn VN (VD: 30A-123.45 hoặc 51K-888.88 hoặc 29A-1234)
function formatLicensePlate(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return "";

  // Bắt đầu bằng 2 số tỉnh + 1 hoặc 2 chữ cái (VD: 30K, 29LD)
  const match = clean.match(/^([0-9]{2}[A-Z]{1,2})([0-9]*)$/);
  if (match) {
    const prefix = match[1];
    const nums = match[2];
    if (!nums) return prefix;
    if (nums.length <= 4) {
      return `${prefix}-${nums}`;
    }
    // 5 số: 3 số đầu + '.' + 2 số cuối (VD: 30K-888.88)
    const p1 = nums.slice(0, 3);
    const p2 = nums.slice(3, 5);
    return `${prefix}-${p1}.${p2}`;
  }

  return clean;
}

// Kiểm tra biển số xe ô tô có đúng chuẩn định dạng Việt Nam
function isValidLicensePlate(plate: string): boolean {
  const clean = plate.trim().toUpperCase().replace(/\s+/g, "");
  // Chuẩn 5 số: 30A-123.45, 51K-888.88, 29LD-123.45
  const regex5 = /^[1-9][0-9][A-Z]{1,2}-[0-9]{3}\.[0-9]{2}$/;
  // Chuẩn 4 số: 29A-1234, 30H-5678
  const regex4 = /^[1-9][0-9][A-Z]{1,2}-[0-9]{4}$/;
  return regex5.test(clean) || regex4.test(clean);
}

export default function Booking() {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Khách hàng
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCity, setCustomerCity] = useState("TP. Hà Nội");
  const [customerNotes, setCustomerNotes] = useState("");
  // Giữ nguyên khóa cho cùng một lần xác nhận đặt lịch (kể cả gửi lại sau lỗi mạng); đổi khóa sau khi thành công.
  const bookingKey = useRef<string | null>(null);

  // Step 2: Xe & Dịch vụ (Chỉ giữ xe ô tô, bỏ moto/xe máy và xe điện)
  const [vehicleType, setVehicleType] = useState<VehicleType>("Sedan / Hatchback (4-5 chỗ)");
  const [vehicleBrand, setVehicleBrand] = useState("Toyota");
  const [vehicleModel, setVehicleModel] = useState("Vios");
  const [customModel, setCustomModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [selectedService, setSelectedService] = useState<ServiceProduct>(SERVICE_PRODUCTS[0]);
  const [selectedSavedVehicleId, setSelectedSavedVehicleId] = useState<number | null>(null);

  // Step 3: Ngày & Giờ
  const [garageBranch, setGarageBranch] = useState(GARAGE_BRANCHES[0].fullName);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Step 4: Biên nhận
  const [bookingCode, setBookingCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User state
  const [savedVehicles, setSavedVehicles] = useState<SavedVehicle[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Generate today and the next 7 days
  const upcomingDates = useMemo(() => {
    const dates = [];
    const weekdays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const now = new Date();

    for (let i = 0; i <= 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const dayName = i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : weekdays[d.getDay()];
      const dayFormatted = `${d.getDate()}/${d.getMonth() + 1}`;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      dates.push({
        index: i,
        dayName,
        dayFormatted,
        fullLabel: `${dayName}, ${dayFormatted}/${year}`,
        isoDate: `${year}-${month}-${day}`,
        dayOfWeek: d.getDay(),
      });
    }
    return dates;
  }, []);

  // Fetch logged in user info & vehicles if available
  useEffect(() => {
    const token = localStorage.getItem("token");
    const logged = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(Boolean(token && logged));

    if (token && logged) {
      // B1: \u0110i\u1ec1n ngay t\u1eeb localStorage (\u0111\u1ec3 form hi\u1ec7n th\u00f4ng tin t\u1ee9c th\u1eddi, kh\u00f4ng ch\u1edd API)
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          // user object: { id, email, role, customer: { full_name, phone, email, address } }
          const c = u?.customer;
          if (c?.full_name) setCustomerName(c.full_name);
          if (c?.phone) setCustomerPhone(c.phone);
          if (c?.email) setCustomerEmail(c.email);
          else if (u?.email) setCustomerEmail(u.email);
          if (c?.address) setCustomerCity(c.address);
        } catch {
          // ignore
        }
      }

      // B2: G\u1ecdi API /me \u0111\u1ec3 l\u1ea5y d\u1eef li\u1ec7u m\u1edbi nh\u1ea5t (account.customer)
      fetchApi("/me")
        .then((res) => {
          const c = res?.account?.customer;
          if (c) {
            if (c.full_name) setCustomerName(c.full_name);
            if (c.phone) setCustomerPhone(c.phone);
            if (c.email) setCustomerEmail(c.email);
            if (c.address) setCustomerCity(c.address);
            // C\u1eadp nh\u1eadt l\u1ea1i localStorage \u0111\u1ec3 l\u1ea7n sau nhanh h\u01a1n
            try {
              const stored = JSON.parse(localStorage.getItem("user") || "{}");
              stored.customer = c;
              localStorage.setItem("user", JSON.stringify(stored));
            } catch { /* ignore */ }
          } else if (res?.account?.email && !res?.account?.customer) {
            // Kh\u00f4ng c\u00f3 customer profile, fallback sang /me/customer
            fetchApi("/me/customer")
              .then((r) => {
                if (r?.data) {
                  if (r.data.full_name) setCustomerName(r.data.full_name);
                  if (r.data.phone) setCustomerPhone(r.data.phone);
                  if (r.data.email) setCustomerEmail(r.data.email);
                  if (r.data.address) setCustomerCity(r.data.address);
                }
              })
              .catch(() => { /* ignore */ });
          }
        })
        .catch(() => {
          // /me th\u1ea5t b\u1ea1i, th\u00f4ng tin t\u1eeb localStorage \u0111\u00e3 \u0111\u01b0\u1ee3c \u0111i\u1ec1n \u1edf B1
        });


      // Fetch saved vehicles
      const paramVehicleId = searchParams.get("vehicle_id");
      fetchApi("/me/vehicles")
        .then((res) => {
          const list: SavedVehicle[] = Array.isArray(res?.data) ? res.data : [];
          setSavedVehicles(list);
          if (list.length > 0) {
            const matched = paramVehicleId
              ? list.find((item: SavedVehicle) => String(item.id) === paramVehicleId)
              : null;
            const target = matched ?? list[0];
            setSelectedSavedVehicleId(target.id);
            if (target.model?.brand?.name) setVehicleBrand(target.model.brand.name);
            if (target.model?.name) setVehicleModel(target.model.name);
            if (target.license_plate) setVehiclePlate(target.license_plate);
          }
        })
        .catch(() => {
          // guest mode or vehicle fetch error
        });
    }
  }, [searchParams]);

  // \u0110\u1ecdc service query param t\u1eeb URL v\u00e0 auto-select g\u00f3i d\u1ecbch v\u1ee5 t\u01b0\u01a1ng \u1ee9ng
  useEffect(() => {
    const serviceParam = searchParams.get("service");
    if (!serviceParam) return;
    const matchedProduct = SERVICE_PRODUCTS.find((product) => product.id === serviceParam);
    if (matchedProduct) {
      setSelectedService(matchedProduct);
    }
  }, [searchParams]);

  // Khi \u0111\u00e3 \u0111\u0103ng nh\u1eadp + c\u00f3 service param + th\u00f4ng tin kh\u00e1ch h\u00e0ng \u0111\u00e3 \u0111\u01b0\u1ee3c \u0111i\u1ec1n \u2192 t\u1ef1 \u0111\u1ed9ng nh\u1ea3y sang b\u01b0\u1edbc 2
  useEffect(() => {
    const serviceParam = searchParams.get("service");
    if (!serviceParam) return;
    if (!isLoggedIn) return;
    if (!customerName || !customerPhone || !customerEmail) return;
    if (currentStep === 1) {
      goToStep(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, customerName, customerPhone, customerEmail]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleBrandChange = (newBrand: string) => {
    setSelectedSavedVehicleId(null);
    setVehicleBrand(newBrand);
    const brandModels = getModelsForVehicleType(newBrand, vehicleType);
    setVehicleModel(brandModels.length > 0 ? brandModels[0] : "");
    setCustomModel("");
    if (errors.model) {
      setErrors((prev) => ({ ...prev, model: "" }));
    }
  };

  const handleVehicleTypeChange = (newType: VehicleType) => {
    setSelectedSavedVehicleId(null);
    setVehicleType(newType);
    const compatibleModels = getModelsForVehicleType(vehicleBrand, newType);
    if (vehicleModel !== "Khác" && !compatibleModels.includes(vehicleModel)) {
      setVehicleModel(compatibleModels[0] || "");
      setCustomModel("");
    }
    if (errors.model) setErrors((prev) => ({ ...prev, model: "" }));
  };

  const handleModelChange = (newModel: string) => {
    setSelectedSavedVehicleId(null);
    setVehicleModel(newModel);
    const inferredType = getVehicleTypeForModel(newModel);
    if (inferredType) setVehicleType(inferredType);
    if (errors.model) setErrors((prev) => ({ ...prev, model: "" }));
  };

  const handleSelectSavedVehicle = (vId: number | null) => {
    setSelectedSavedVehicleId(vId);
    if (!vId) {
      setVehiclePlate("");
      return;
    }
    const v = savedVehicles.find((item) => item.id === vId);
    if (v) {
      if (v.model?.name) {
        setVehicleModel(v.model.name);
        const brandName = v.model.brand?.name || getBrandForModel(v.model.name);
        if (brandName) setVehicleBrand(brandName);
        const inferredType = getVehicleTypeForModel(v.model.name);
        if (inferredType) setVehicleType(inferredType);
      } else if (v.model?.brand?.name) {
        setVehicleBrand(v.model.brand.name);
      }
      if (v.license_plate) {
        setVehiclePlate(formatLicensePlate(v.license_plate));
      }
    }
  };

  // Validation Step 1
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!customerName.trim()) {
      newErrors.name = "Vui lòng nhập họ tên của bạn.";
    }

    const phoneRegex = /^(?:0[35789]\d{8}|\+?84[35789]\d{8})$/;
    const normalizedPhone = customerPhone.replace(/[\s().-]/g, "");
    if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
      newErrors.phone = "Vui lòng nhập số điện thoại hợp lệ.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail.trim() || !emailRegex.test(customerEmail.trim())) {
      newErrors.email = "Vui lòng nhập email hợp lệ.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validation Step 2 (Kiểm tra đúng dòng xe theo hãng & chuẩn form biển số)
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    // 1. Kiểm tra dòng xe theo hãng
    const effectiveModel = vehicleModel === "Khác" ? customModel.trim() : vehicleModel.trim();
    if (!effectiveModel) {
      newErrors.model = `Vui lòng chọn hoặc nhập dòng xe cho hãng ${vehicleBrand}.`;
    } else if (vehicleBrand !== "Hãng khác" && vehicleModel !== "Khác") {
      const validModels = BRAND_MODELS[vehicleBrand] || [];
      if (!validModels.includes(vehicleModel)) {
        newErrors.model = `Dòng xe "${vehicleModel}" không thuộc danh mục xe của hãng ${vehicleBrand}.`;
      }
    }

    // 2. Kiểm tra chuẩn form biển số xe ô tô
    if (!vehiclePlate.trim()) {
      newErrors.plate = "Vui lòng nhập biển số xe.";
    } else if (!isValidLicensePlate(vehiclePlate)) {
      newErrors.plate = "Biển số xe không đúng chuẩn (VD: 30A-123.45 hoặc 51K-888.88).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Kiểm tra khung giờ trong ngày có bị quá giờ so với thời điểm hiện tại hay không
  const isSlotUnavailable = (timeStr: string, dateIndex = selectedDateIndex) => {
    const selectedDate = upcomingDates[dateIndex];
    if (!selectedDate) return false;

    const slotDateTime = new Date(`${selectedDate.isoDate}T${timeStr}:00`);
    return slotDateTime <= new Date() || (selectedDate.dayOfWeek === 0 && timeStr > "12:00");
  };

  const handleDateSelect = (index: number) => {
    setSelectedDateIndex(index);
    if (selectedTime && isSlotUnavailable(selectedTime, index)) {
      setSelectedTime("");
    }
  };

  // Validation Step 3
  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedTime) {
      newErrors.time = "Vui lòng chọn một khung giờ làm việc.";
    } else if (isSlotUnavailable(selectedTime)) {
      newErrors.time = "Khung giờ đã qua hoặc garage không phục vụ vào thời điểm này.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 140, behavior: "smooth" });
  };

  const handleNextClick = async () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        goToStep(2);
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        goToStep(3);
      }
    } else if (currentStep === 3) {
      if (validateStep3()) {
        setShowConfirmModal(true);
      }
    }
  };

  const handleConfirmSubmit = async () => {
    await completeBooking();
  };

  const completeBooking = async () => {
    if (!isLoggedIn) {
      setSubmissionError("Vui lòng đăng nhập để CarService ghi nhận lịch hẹn.");
      return;
    }

    setSubmitting(true);
    setSubmissionError("");

    const selectedDateObj = upcomingDates[selectedDateIndex] || upcomingDates[0];
    const finalModelName = vehicleModel === "Khác" ? customModel.trim() : vehicleModel;
    bookingKey.current ??= newIdempotencyKey();
    try {
      const response = await fetchApi("/appointments", {
        method: "POST",
        headers: { "Idempotency-Key": bookingKey.current },
        body: JSON.stringify({
          ...(selectedSavedVehicleId
            ? { vehicle_id: selectedSavedVehicleId }
            : {
                new_vehicle: {
                  brand: vehicleBrand,
                  model: finalModelName,
                  license_plate: vehiclePlate.trim().toUpperCase(),
                  vehicle_type: vehicleType,
                },
              }),
          appointment_date: selectedDateObj.isoDate,
          appointment_time: selectedTime,
          request_type: "MAINTENANCE",
          note: customerNotes.trim() || null,
          service_name: selectedService.backendServiceName,
        }),
      });
      const finalCode = response?.data?.appointment_code;
      if (!finalCode) {
        throw new Error("CarService chưa trả mã lịch hẹn. Vui lòng thử lại.");
      }

      setBookingCode(finalCode);
      bookingKey.current = null;
      // Lịch đặt thành công chỉ lưu tại Laravel/MySQL; không nhân bản thông tin khách và xe vào localStorage.

      setShowConfirmModal(false);
      goToStep(4);

      setTimeout(() => {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      }, 150);
    } catch (err) {
      setSubmissionError(err instanceof Error ? err.message : "Không thể gửi lịch hẹn. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyBookingCode = () => {
    if (!bookingCode) return;
    navigator.clipboard.writeText(bookingCode).then(() => {
      showToast(`Đã sao chép mã phiếu hẹn: ${bookingCode}`);
    });
  };

  const printReceipt = () => {
    window.print();
  };

  const resetFormToStart = () => {
    setCustomerNotes("");
    setSelectedTime("");
    setErrors({});
    goToStep(1);
    showToast("Đã làm mới thông tin đặt lịch!");
  };

  const selectedDateObj = upcomingDates[selectedDateIndex] || upcomingDates[0];
  const finalModelDisplayName = vehicleModel === "Khác" ? customModel.trim() || "Xe riêng" : vehicleModel;

  return (
    <div className="min-h-screen bg-[var(--cs-bg,#f7f7f6)] [&_button:not(:disabled)]:cursor-pointer [&_a]:cursor-pointer text-[var(--cs-text,#191919)] [&_.bg-white]:bg-[var(--cs-surface,#fff)] [&_.bg-slate-50]:bg-[var(--cs-bg,#f7f7f6)] [&_.bg-slate-100]:bg-[var(--cs-surface-2,#f1f1ef)] [&_.text-slate-900]:text-[var(--cs-text,#191919)] [&_.text-slate-800]:text-[var(--cs-text,#191919)] [&_.text-slate-700]:text-[var(--cs-text,#191919)] [&_.text-slate-600]:text-[var(--cs-muted,#757575)] [&_.text-slate-500]:text-[var(--cs-muted,#757575)] [&_.border-slate-200]:border-[var(--cs-border,#e9e9e6)] [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 [&_input]:accent-[#cf2935] [&_input]:focus-visible:outline-[#cf2935] [&_select]:focus-visible:outline-[#cf2935] [&_textarea]:focus-visible:outline-[#cf2935] min-h-screen bg-slate-50 text-slate-800 antialiased font-sans flex flex-col justify-between selection:bg-[#1F2933] selection:text-white">

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-grow">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#B68A43] transition"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Trở về trang chủ</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="fa-solid fa-headset text-[#B68A43]"></i>
            <span>Hỗ trợ nhanh: <strong className="text-slate-800">033 240 5972</strong></span>
          </div>
        </div>

        {/* Title Section */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#B68A43] bg-[#F3E8D2] px-3 py-1 rounded-full mb-2">
            <i className="fa-solid fa-bolt-lightning text-amber-500"></i> Nhanh chóng & Tiện lợi
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Lịch bảo dưỡng mới
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-lg mx-auto">
            Chọn xe, gói chăm sóc và thời gian bạn muốn mang xe đến gara.
          </p>
        </div>

        {/* Stepper Navigation */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 mb-8">
          <div className=" relative flex items-center justify-between max-w-3xl mx-auto">
            {/* Background Track Line */}
            <div className="left-[12.5%] right-[12.5%] top-5 -translate-y-1/2 sm:top-[22px] absolute h-1 bg-slate-100 z-0"></div>
            {/* Dynamic Progress Line */}
            <div
              className="left-[12.5%] top-5 -translate-y-1/2 sm:top-[22px] absolute h-1 bg-[#1F2933] z-0 transition-all duration-500 ease-out"
              style={{
                width: `${((currentStep - 1) / 3) * 75}%`,
              }}
            ></div>

            {/* Step 1 Indicator */}
            <div
              onClick={() => currentStep > 1 && currentStep !== 4 && goToStep(1)}
              className={`relative z-10 flex flex-1 flex-col items-center group ${currentStep > 1 && currentStep !== 4 ? "cursor-pointer" : "cursor-default"}`}
            >
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  currentStep > 1
                    ? "bg-emerald-600 text-white shadow-sm"
                    : currentStep === 1
                    ? "bg-[#1F2933] text-white ring-4 ring-[#F3E8D2] shadow-md"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentStep > 1 ? <i className="fa-solid fa-check text-xs"></i> : <span>1</span>}
              </div>
              <span
                className={`text-xs sm:text-sm mt-2 text-center whitespace-nowrap ${
                  currentStep > 1
                    ? "font-semibold text-emerald-700"
                    : currentStep === 1
                    ? "font-bold text-[#B68A43]"
                    : "font-medium text-slate-400"
                }`}
              >
                Khách hàng
              </span>
            </div>

            {/* Step 2 Indicator */}
            <div
              onClick={() => currentStep > 2 && currentStep !== 4 && goToStep(2)}
              className={`relative z-10 flex flex-1 flex-col items-center group ${currentStep > 2 && currentStep !== 4 ? "cursor-pointer" : "cursor-default"}`}
            >
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  currentStep > 2
                    ? "bg-emerald-600 text-white shadow-sm"
                    : currentStep === 2
                    ? "bg-[#1F2933] text-white ring-4 ring-[#F3E8D2] shadow-md"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentStep > 2 ? <i className="fa-solid fa-check text-xs"></i> : <span>2</span>}
              </div>
              <span
                className={`text-xs sm:text-sm mt-2 text-center whitespace-nowrap ${
                  currentStep > 2
                    ? "font-semibold text-emerald-700"
                    : currentStep === 2
                    ? "font-bold text-[#B68A43]"
                    : "font-medium text-slate-400"
                }`}
              >
                Xe & Dịch vụ
              </span>
            </div>

            {/* Step 3 Indicator */}
            <div
              onClick={() => currentStep > 3 && currentStep !== 4 && goToStep(3)}
              className={`relative z-10 flex flex-1 flex-col items-center group ${currentStep > 3 && currentStep !== 4 ? "cursor-pointer" : "cursor-default"}`}
            >
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  currentStep > 3
                    ? "bg-emerald-600 text-white shadow-sm"
                    : currentStep === 3
                    ? "bg-[#1F2933] text-white ring-4 ring-[#F3E8D2] shadow-md"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentStep > 3 ? <i className="fa-solid fa-check text-xs"></i> : <span>3</span>}
              </div>
              <span
                className={`text-xs sm:text-sm mt-2 text-center whitespace-nowrap ${
                  currentStep > 3
                    ? "font-semibold text-emerald-700"
                    : currentStep === 3
                    ? "font-bold text-[#B68A43]"
                    : "font-medium text-slate-400"
                }`}
              >
                Ngày & Giờ
              </span>
            </div>

            {/* Step 4 Indicator */}
            <div className="relative z-10 flex flex-1 flex-col items-center group cursor-default">
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  currentStep === 4
                    ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentStep === 4 ? <i className="fa-solid fa-check text-xs"></i> : <span>4</span>}
              </div>
              <span
                className={`text-xs sm:text-sm mt-2 text-center whitespace-nowrap ${
                  currentStep === 4
                    ? "font-bold text-emerald-700"
                    : "font-medium text-slate-400"
                }`}
              >
                Xác nhận
              </span>
            </div>
          </div>
        </div>

        {/* Bố cục ATELIER: quy trình API hiện tại vẫn giữ nguyên bốn bước */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(290px,.88fr)] [&>div:first-child]:min-w-0 [&>div:first-child]:rounded-[19px] [&>div:first-child]:p-[18px] sm:[&>div:first-child]:p-6">
        {/* Main Card Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-slate-200/90 relative overflow-hidden">
          {/* ============================================== */}
          {/* STEP 1: THÔNG TIN KHÁCH HÀNG */}
          {/* ============================================== */}
          {currentStep === 1 && (
            <div>
              <div className="flex flex-col items-start justify-between gap-3 mb-6 pb-4 border-b border-slate-100 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F3E8D2] text-[#B68A43] flex items-center justify-center font-bold text-sm">
                    <i className="fa-regular fa-user"></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Thông tin cá nhân & Liên hệ</h2>
                    <p className="text-xs text-slate-500">Chúng tôi sẽ gửi mã lịch hẹn và liên hệ tư vấn qua thông tin này.</p>
                  </div>
                </div>

                {isLoggedIn && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    <i className="fa-solid fa-check-circle"></i> Đã đồng bộ tài khoản
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Họ và tên */}
                <div>
                  <label htmlFor="customerName" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <i className="fa-regular fa-user text-sm"></i>
                    </span>
                    <input
                      type="text"
                      id="customerName"
                      required
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (errors.name) setErrors({ ...errors, name: "" });
                      }}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#D6A85F]/30 focus:border-[#D6A85F] transition ${
                        isLoggedIn && customerName
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-slate-200"
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* Số điện thoại */}
                <div>
                  <label htmlFor="customerPhone" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <i className="fa-solid fa-phone text-sm"></i>
                    </span>
                    <input
                      type="tel"
                      id="customerPhone"
                      required
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        if (errors.phone) setErrors({ ...errors, phone: "" });
                      }}
                      placeholder="Ví dụ: 0912 345 678"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#D6A85F]/30 focus:border-[#D6A85F] transition ${
                        isLoggedIn && customerPhone
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-slate-200"
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="customerEmail" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Email nhận phiếu hẹn <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <i className="fa-regular fa-envelope text-sm"></i>
                    </span>
                    <input
                      type="email"
                      id="customerEmail"
                      required
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: "" });
                      }}
                      placeholder="Ví dụ: vanan@gmail.com"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#D6A85F]/30 focus:border-[#D6A85F] transition ${
                        isLoggedIn && customerEmail
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-slate-200"
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                {/* Khu vực / Quận huyện */}
                <div>
                  <label htmlFor="customerCity" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Khu vực / Tỉnh thành <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <i className="fa-solid fa-location-dot text-sm"></i>
                    </span>
                    <select
                      id="customerCity"
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D6A85F]/30 focus:border-[#D6A85F] transition bg-white text-slate-800"
                    >
                      <option value="TP. Hà Nội">TP. Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="TP. Đà Nẵng">TP. Đà Nẵng</option>
                      <option value="TP. Hải Phòng">TP. Hải Phòng</option>
                      <option value="Bình Dương">Bình Dương</option>
                      <option value="Tỉnh thành khác">Tỉnh thành khác</option>
                    </select>
                  </div>
                </div>

                {/* Ghi chú đặc biệt */}
                <div className="sm:col-span-2">
                  <label htmlFor="customerNotes" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Ghi chú hoặc tình trạng hiện tại của xe (Không bắt buộc)
                  </label>
                  <textarea
                    id="customerNotes"
                    rows={3}
                    maxLength={500}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Ví dụ: Xe phát ra tiếng kêu lạ ở trục bánh trước khi vào cua, cần kiểm tra phanh..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D6A85F]/30 focus:border-[#D6A85F] transition"
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* STEP 2: THÔNG TIN XE & DỊCH VỤ */}
          {/* ============================================== */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F3E8D2] text-[#B68A43] flex items-center justify-center font-bold text-sm">
                    <i className="fa-solid fa-car"></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Chi tiết Phương tiện & Gói Dịch vụ</h2>
                    <p className="text-xs text-slate-500">Chỉ áp dụng dịch vụ cho xe ô tô, đảm bảo đúng chuẩn kỹ thuật hãng xe.</p>
                  </div>
                </div>

                {savedVehicles.length > 0 && (
                  <div className="flex w-full items-center gap-2 text-xs text-slate-600 sm:w-auto">
                    <span className="font-semibold">Xe đã lưu:</span>
                    <select
                      value={selectedSavedVehicleId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        handleSelectSavedVehicle(val);
                      }}
                      className="min-w-0 w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-800 sm:w-auto"
                    >
                      <option value="">-- Chọn xe đã lưu --</option>
                      {savedVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.model?.brand?.name} {v.model?.name} ({v.license_plate || "Chưa có biển"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Phân loại phương tiện (Đã loại bỏ xe máy / mô tô và xe điện theo yêu cầu) */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">
                  Phân loại xe ô tô <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {[
                    { label: "Sedan / Hatchback (4-5 chỗ)", value: "Sedan / Hatchback (4-5 chỗ)", icon: "fa-solid fa-car-side" },
                    { label: "SUV / Crossover (5-7 chỗ)", value: "SUV / Crossover (5-7 chỗ)", icon: "fa-solid fa-car" },
                    { label: "Bán tải / MPV (7-8 chỗ)", value: "Bán tải / MPV (7-8 chỗ)", icon: "fa-solid fa-truck-pickup" },
                  ].map((item) => (
                    <label key={item.value} className="group cursor-pointer">
                      <input
                        type="radio"
                        name="vehicleType"
                        value={item.value}
                        checked={vehicleType === item.value}
                        onChange={(e) => handleVehicleTypeChange(e.target.value as VehicleType)}
                        className="peer sr-only"
                      />
                      <div className="group-hover:-translate-y-px group-hover:border-[#c4646b] peer-checked:border-[#cf2935] peer-checked:bg-[var(--cs-soft,#fff1f1)] peer-checked:ring-1 peer-checked:ring-[#cf2935] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#cf2935] p-4 rounded-xl border-2 border-slate-200 bg-white text-center transition">
                        <i className={`${item.icon} text-2xl text-slate-600 mb-2 block`}></i>
                        <span className="text-xs font-bold block text-slate-800">{item.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Chi tiết Hãng xe, Dòng xe (chuẩn theo hãng), Biển số xe (chuẩn form) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {/* 1. Hãng xe */}
                <div>
                  <label htmlFor="vehicleBrand" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Hãng xe <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="vehicleBrand"
                    value={vehicleBrand}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D6A85F]/30 focus:border-[#D6A85F] transition bg-white"
                  >
                    {Object.keys(BRAND_MODELS).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Chọn hãng sản xuất xe ô tô</p>
                </div>

                {/* 2. Dòng xe chuẩn theo hãng */}
                <div>
                  <label htmlFor="vehicleModel" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Dòng xe ({vehicleBrand}) <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="vehicleModel"
                    value={vehicleModel}
                    onChange={(e) => {
                      handleModelChange(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D6A85F]/30 focus:border-[#D6A85F] transition bg-white"
                  >
                    <option value="">-- Chọn dòng xe của {vehicleBrand} --</option>
                    {getModelsForVehicleType(vehicleBrand, vehicleType).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="Khác">Dòng xe khác của {vehicleBrand}...</option>
                  </select>

                  {/* Nhập tay nếu chọn "Khác" hoặc hãng khác */}
                  {vehicleModel === "Khác" && (
                    <input
                      type="text"
                      placeholder={`Nhập tên dòng xe ${vehicleBrand}...`}
                      value={customModel}
                      onChange={(e) => {
                        setSelectedSavedVehicleId(null);
                        setCustomModel(e.target.value);
                        if (errors.model) setErrors((prev) => ({ ...prev, model: "" }));
                      }}
                      className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D6A85F]/30 focus:border-[#D6A85F] transition"
                    />
                  )}
                  {errors.model && <p className="text-xs text-red-500 mt-1">{errors.model}</p>}
                </div>

                {/* 3. Biển số xe chuẩn form */}
                <div>
                  <label htmlFor="vehiclePlate" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Biển số xe ô tô <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="vehiclePlate"
                    required
                    value={vehiclePlate}
                    onChange={(e) => {
                      setSelectedSavedVehicleId(null);
                      const formatted = formatLicensePlate(e.target.value);
                      setVehiclePlate(formatted);
                      if (errors.plate) setErrors((prev) => ({ ...prev, plate: "" }));
                    }}
                    placeholder="VD: 30A-123.45 hoặc 51K-888.88"
                    maxLength={12}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm uppercase font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#D6A85F]/30 focus:border-[#D6A85F] transition"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Chuẩn form: <strong>30A-123.45</strong> hoặc <strong>51K-888.88</strong>
                  </p>
                  {errors.plate && <p className="text-xs text-red-500 mt-1">{errors.plate}</p>}
                </div>
              </div>

              {/* Lựa chọn gói dịch vụ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">
                  Chọn gói dịch vụ dự kiến <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {SERVICE_PRODUCTS.map((pkg) => {
                    const isChecked = selectedService.id === pkg.id;
                    return (
                      <label key={pkg.id} className="group cursor-pointer">
                        <input
                          type="radio"
                          name="servicePackage"
                          value={pkg.id}
                          checked={isChecked}
                          onChange={() => setSelectedService(pkg)}
                          className="peer sr-only"
                        />
                        <div
                          className={`group-hover:-translate-y-px group-hover:border-[#c4646b] peer-checked:border-[#cf2935] peer-checked:bg-[var(--cs-soft,#fff1f1)] peer-checked:ring-1 peer-checked:ring-[#cf2935] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#cf2935] p-4 rounded-2xl border-2 transition relative ${
                            isChecked
                              ? "border-[#1F2933] bg-[#F3E8D2]/40"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <i className={`${pkg.icon} ${pkg.iconColor}`}></i> {pkg.title}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1">{pkg.description}</p>
                            </div>
                            <span className="text-sm font-extrabold text-[#B68A43] whitespace-nowrap ml-2">
                              {pkg.price}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-slate-400 font-medium flex items-center gap-1">
                            <i className="fa-regular fa-clock"></i> ~{pkg.time}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* STEP 3: CHỌN NGÀY & GIỜ HẸN */}
          {/* ============================================== */}
          {currentStep === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-[#F3E8D2] text-[#B68A43] flex items-center justify-center font-bold text-sm">
                  <i className="fa-regular fa-calendar-check"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Thời gian & Địa điểm Chi nhánh</h2>
                  <p className="text-xs text-slate-500">Chọn garage thuận tiện và khung giờ phục vụ tốt nhất.</p>
                </div>
              </div>

              {/* Chi nhánh Garage */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Chọn Garage / Trung tâm dịch vụ <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {GARAGE_BRANCHES.map((b) => {
                    const isChecked = garageBranch === b.fullName;
                    return (
                      <label key={b.id} className="group cursor-pointer">
                        <input
                          type="radio"
                          name="garageBranch"
                          value={b.fullName}
                          checked={isChecked}
                          onChange={(e) => setGarageBranch(e.target.value)}
                          className="peer sr-only"
                        />
                        <div className={`border-[var(--cs-border,#e9e9e6)] bg-[var(--cs-surface,#fff)] group-hover:border-[#cf2935] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#cf2935] p-3.5 rounded-xl border-2 transition ${isChecked ? "border-[#cf2935]! bg-[var(--cs-soft,#fff1f1)]! ring-1 ring-[#cf2935]" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-800">{b.name}</span>
                            <span className="text-black! text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                              {b.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            <i className="fa-solid fa-map-pin text-[#B68A43] mr-1"></i> {b.address}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Lịch hôm nay và 7 ngày tiếp theo */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Chọn ngày hẹn (hôm nay và 7 ngày tới) <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                  {upcomingDates.map((d) => {
                    const isSelected = selectedDateIndex === d.index;
                    return (
                      <button
                        key={d.index}
                        type="button"
                        onClick={() => handleDateSelect(d.index)}
                        className={`border-[var(--cs-border,#e9e9e6)] bg-[var(--cs-surface,#fff)] text-[var(--cs-text,#191919)] hover:border-[#cf2935] flex-shrink-0 w-24 py-3 px-2 rounded-2xl border-2 text-center transition cursor-pointer ${isSelected ? "border-[#cf2935]! bg-[#cf2935]! font-bold text-white! ring-2 ring-[#cf2935]/20 [&_span]:text-white!" : ""}`}
                      >
                        <span
                          className={` block text-xs uppercase tracking-wider ${isSelected ? "font-bold" : ""}`}
                        >
                          {d.dayName}
                        </span>
                        <span className="block text-base font-extrabold mt-0.5">{d.dayFormatted}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Giờ hẹn: Sáng & Chiều */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Chọn khung giờ phục vụ <span className="text-red-500">*</span>
                </label>

                <div className="space-y-4">
                  {/* Buổi sáng */}
                  <div>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
                      <i className="fa-regular fa-sun text-amber-500"></i> Buổi Sáng (08:00 - 11:30)
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                      {MORNING_SLOTS.map((slotTime) => {
                        const isPassed = isSlotUnavailable(slotTime);
                        const isSelected = selectedTime === slotTime;

                        if (isPassed) {
                          return (
                            <button
                              key={slotTime}
                              type="button"
                              disabled
                              title="Khung giờ đã qua hoặc garage không phục vụ vào thời điểm này"
                              className="p-2.5 rounded-xl border border-slate-100 bg-slate-100/70 text-xs font-semibold text-slate-400 cursor-not-allowed flex flex-col items-center justify-center opacity-60"
                            >
                              <span className="line-through">{slotTime}</span>
                              <span className="text-xs text-slate-400 font-normal">Không khả dụng</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={slotTime}
                            type="button"
                            onClick={() => {
                              setSelectedTime(slotTime);
                              if (errors.time) setErrors({ ...errors, time: "" });
                            }}
                            className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer active:scale-95 transition ${
                              isSelected
                                ? "bg-[#1F2933] text-white border-[#1F2933] ring-2 ring-[#E8D3A8] shadow-sm"
                                : "border-slate-200 text-slate-700 hover:border-[#D6A85F] bg-white hover:bg-[#F3E8D2]/30"
                            }`}
                          >
                            {slotTime}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Buổi chiều */}
                  <div>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
                      <i className="fa-solid fa-cloud-sun text-orange-500"></i> Buổi Chiều (13:30 - 17:30)
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                      {AFTERNOON_SLOTS.map((slotTime) => {
                        const isPassed = isSlotUnavailable(slotTime);
                        const isSelected = selectedTime === slotTime;

                        if (isPassed) {
                          return (
                            <button
                              key={slotTime}
                              type="button"
                              disabled
                              title="Khung giờ đã qua hoặc garage không phục vụ vào thời điểm này"
                              className="p-2.5 rounded-xl border border-slate-100 bg-slate-100/70 text-xs font-semibold text-slate-400 cursor-not-allowed flex flex-col items-center justify-center opacity-60"
                            >
                              <span className="line-through">{slotTime}</span>
                              <span className="text-xs text-slate-400 font-normal">Không khả dụng</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={slotTime}
                            type="button"
                            onClick={() => {
                              setSelectedTime(slotTime);
                              if (errors.time) setErrors({ ...errors, time: "" });
                            }}
                            className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer active:scale-95 transition ${
                              isSelected
                                ? "bg-[#1F2933] text-white border-[#1F2933] ring-2 ring-[#E8D3A8] shadow-sm"
                                : "border-slate-200 text-slate-700 hover:border-[#D6A85F] bg-white hover:bg-[#F3E8D2]/30"
                            }`}
                          >
                            {slotTime}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Thông báo nếu toàn bộ khung giờ trong ngày hôm nay đã qua */}
                {upcomingDates[selectedDateIndex]?.dayOfWeek === 0 && (
                  <p className="mt-3 text-xs text-amber-700">
                    Chủ nhật, CarService chỉ nhận lịch đến 12:00.
                  </p>
                )}

                {errors.time && <p className="text-xs text-red-500 mt-2">{errors.time}</p>}
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* STEP 4: HOÀN TẤT & BIÊN NHẬN */}
          {/* ============================================== */}
          {currentStep === 4 && (
            <div>
              {/* Success celebration banner */}
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
                  <i className="fa-solid fa-check"></i>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">Đặt Lịch Thành Công!</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  Cảm ơn quý khách. Yêu cầu đặt hẹn của bạn đã được ghi nhận trên hệ thống quản lý dịch vụ.
                </p>
              </div>

              {/* Ticket Card Summary */}
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-7 relative overflow-hidden">
                {/* Top Tag */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4 mb-4">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                      Mã phiếu hẹn
                    </span>
                    <p className="text-lg font-mono font-extrabold text-[#B68A43]">{bookingCode}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-medium">Trạng thái</span>
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Chờ CarService xác nhận
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Table/Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase block">
                      Khách hàng:
                    </span>
                    <p className="font-bold text-slate-900">{customerName}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{customerPhone}</p>
                    <p className="text-xs text-slate-500">{customerEmail}</p>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase block">
                      Phương tiện:
                    </span>
                    <p className="font-bold text-slate-900">
                      {vehicleBrand} {finalModelDisplayName} ({vehiclePlate})
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">{vehicleType}</p>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase block">
                      Thời gian hẹn:
                    </span>
                    <p className="font-bold text-[#6D542A] flex items-center gap-1.5 mt-0.5">
                      <i className="fa-regular fa-clock text-[#B68A43]"></i>
                      <span>
                        {selectedTime} - {selectedDateObj.fullLabel}
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase block">
                      Địa điểm thực hiện:
                    </span>
                    <p className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5">
                      {garageBranch}
                    </p>
                  </div>

                  <div className="sm:col-span-2 pt-3 border-t border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase block mb-1">
                      Gói dịch vụ đã chọn:
                    </span>
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-circle-check text-[#B68A43]"></i>
                        <span className="font-bold text-slate-800 text-sm">
                          {selectedService.title}
                        </span>
                      </div>
                      <span className="font-extrabold text-slate-900">{selectedService.price}</span>
                    </div>
                  </div>
                </div>

                {/* Notes preview if any */}
                {customerNotes.trim() && (
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase block">
                      Ghi chú của bạn:
                    </span>
                    <p className="text-xs text-slate-600 italic mt-1">"{customerNotes}"</p>
                  </div>
                )}
              </div>

              {/* Bottom Actions for Step 4 */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={printReceipt}
                  className="cs-btn cs-btn-secondary"
                >
                  <i className="fa-solid fa-print"></i> In phiếu hẹn
                </button>
                <button
                  type="button"
                  onClick={copyBookingCode}
                  className="cs-btn cs-btn-secondary"
                >
                  <i className="fa-regular fa-copy"></i> Sao chép mã
                </button>
                <button
                  type="button"
                  onClick={resetFormToStart}
                  className="cs-btn cs-btn-primary"
                >
                  <i className="fa-solid fa-plus"></i> Đặt lịch hẹn khác
                </button>
              </div>
            </div>
          )}

          {/* Controls Footer (Hidden in Step 4) */}
          {currentStep < 4 && (
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => goToStep(currentStep - 1)}
                  className="cs-btn cs-btn-ghost"
                >
                  <i className="fa-solid fa-arrow-left"></i> Quay lại
                </button>
              ) : (
                <div />
              )}

              <div className="ml-auto">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleNextClick}
                  className="cs-btn cs-btn-primary"
                >
                  {submitting ? (
                    <span>Đang xử lý...</span>
                  ) : currentStep === 1 ? (
                    <>
                      <span>Tiếp tục sang bước 2</span>
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </>
                  ) : currentStep === 2 ? (
                    <>
                      <span>Chọn ngày giờ</span>
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </>
                  ) : (
                    <>
                      <span>Hoàn tất & Xác nhận</span>
                      <i className="fa-solid fa-check text-xs"></i>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="sticky top-[106px] min-h-[430px] rounded-[19px] border border-[var(--cs-border,#e9e9e6)] bg-[var(--cs-surface,#fff)] px-[26px] py-7 max-lg:static max-lg:min-h-0 [&_h2]:mb-5 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_ol]:flex [&_ol]:list-none [&_ol]:flex-col [&_ol]:gap-5 [&_ol]:pl-0 max-lg:[&_ol]:grid max-lg:[&_ol]:grid-cols-2 max-sm:[&_ol]:grid-cols-1 [&_li]:relative [&_li]:pl-7 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-1 [&_li]:before:size-3.5 [&_li]:before:rounded-full [&_li]:before:border-2 [&_li]:before:border-[#cf2935] [&_li]:after:absolute [&_li]:after:bottom-[-18px] [&_li]:after:left-[7px] [&_li]:after:top-6 [&_li]:after:w-px [&_li]:after:bg-[var(--cs-border,#e9e9e6)] [&_li:last-child]:after:hidden [&_li_strong]:mb-1.5 [&_li_strong]:block [&_li_strong]:text-[13px] [&_li_strong]:font-extrabold [&_li_small]:text-xs [&_li_small]:leading-relaxed [&_li_small]:text-[var(--cs-muted,#757575)]" aria-label="Hướng dẫn đặt lịch">
          <p className="mb-3 text-xs font-extrabold tracking-[0.14em] text-[#cf2935]">BOOKING NOTES</p>
          <h2>Đặt lịch thật đơn giản.</h2>
          <ol>
            <li><strong>Thông tin liên hệ</strong><small>Kiểm tra hồ sơ để gara liên hệ với bạn.</small></li>
            <li><strong>Chọn xe và dịch vụ</strong><small>Chọn xe đã lưu hoặc khai xe mới theo form.</small></li>
            <li><strong>Chọn khung giờ</strong><small>Gara sẽ kiểm tra và xác nhận lịch tiếp nhận.</small></li>
            <li><strong>Kiểm tra & xác nhận</strong><small>Chỉ gửi lịch khi bạn đã kiểm tra thông tin.</small></li>
          </ol>
          <p className="mt-8 rounded-xl border-l-[3px] border-[#cf2935] bg-[var(--cs-soft,#fff1f1)] p-4 text-xs leading-7 text-[var(--cs-muted,#757575)]">Lịch hẹn chỉ giữ khung giờ tiếp nhận; chi phí sửa chữa phát sinh phải có báo giá và sự chấp thuận của bạn.</p>
        </aside>
        </div>

        {/* Trust Badges & Guarantee */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-700">
            <i className="fa-solid fa-shield-halved text-emerald-500 text-base"></i> Phụ tùng chính hãng 100%
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-700">
            <i className="fa-solid fa-clock-rotate-left text-[#B68A43] text-base"></i> Đúng hẹn, không chờ lâu
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-700">
            <i className="fa-solid fa-file-invoice-dollar text-amber-500 text-base"></i> Minh bạch chi phí
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-700">
            <i className="fa-solid fa-certificate text-purple-500 text-base"></i> Bảo hành chu đáo
          </div>
        </div>
      </main>


      {/* Modal xác nhận đặt lịch hẹn */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 transform transition-all relative">
            {/* Nút đóng X */}
            <button
              type="button"
              onClick={() => {
                setShowConfirmModal(false);
                setSubmissionError("");
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-base"></i>
            </button>

            {/* Tiêu đề & Icon */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F3E8D2] text-[#B68A43] flex items-center justify-center text-xl shadow-inner shrink-0">
                <i className="fa-solid fa-calendar-check"></i>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Xác nhận đặt lịch hẹn?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Vui lòng kiểm tra lại thông tin trước khi hoàn tất</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">
              Bạn có chắc chắn muốn xác nhận đặt lịch hẹn này không? Chúng tôi sẽ gửi mã phiếu hẹn và lưu thông tin tiếp nhận xe của bạn.
            </p>

            {submissionError && (
              <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {submissionError}
              </p>
            )}

            {/* Bảng tóm tắt thông tin lịch hẹn */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2.5 mb-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Khách hàng:</span>
                <span className="font-bold text-slate-800">{customerName} ({customerPhone})</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Phương tiện:</span>
                <span className="font-bold text-slate-800">{vehicleBrand} {finalModelDisplayName} ({vehiclePlate})</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Thời gian hẹn:</span>
                <span className="font-bold text-[#B68A43]">{selectedTime} - {selectedDateObj.fullLabel}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Chi nhánh:</span>
                <span className="font-bold text-slate-800">{garageBranch.split("(")[0]?.trim()}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 font-medium">Gói dịch vụ:</span>
                <span className="font-bold text-emerald-600">{selectedService.title} ({selectedService.price})</span>
              </div>
            </div>

            {/* Các nút hành động */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setSubmissionError("");
                }}
                className="cs-btn cs-btn-secondary"
              >
                Hủy / Xem lại
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="cs-btn cs-btn-primary"
              >
                {submitting ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <i className="fa-solid fa-check text-xs"></i>
                    <span>Đồng ý xác nhận</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Modal */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 z-50 text-sm font-medium animate-bounce">
          <i className="fa-solid fa-circle-check text-emerald-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useMemo, useRef, useState } from "react";

type Province = {
  code: number;
  name: string;
};

type Ward = {
  code: number;
  name: string;
};

// Loại bỏ dấu tiếng Việt để tìm kiếm không dấu (VD: "da phuc" -> "đa phúc")
function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

// 63 Tỉnh/Thành phố trực thuộc Trung ương của Việt Nam
const FALLBACK_PROVINCES: Province[] = [
  { code: 1, name: "Thành phố Hà Nội" },
  { code: 79, name: "Thành phố Hồ Chí Minh" },
  { code: 31, name: "Thành phố Hải Phòng" },
  { code: 48, name: "Thành phố Đà Nẵng" },
  { code: 92, name: "Thành phố Cần Thơ" },
  { code: 2, name: "Tỉnh Hà Giang" },
  { code: 4, name: "Tỉnh Cao Bằng" },
  { code: 6, name: "Tỉnh Bắc Kạn" },
  { code: 8, name: "Tỉnh Tuyên Quang" },
  { code: 10, name: "Tỉnh Lào Cai" },
  { code: 11, name: "Tỉnh Điện Biên" },
  { code: 12, name: "Tỉnh Lai Châu" },
  { code: 14, name: "Tỉnh Sơn La" },
  { code: 15, name: "Tỉnh Yên Bái" },
  { code: 17, name: "Tỉnh Hoà Bình" },
  { code: 19, name: "Tỉnh Thái Nguyên" },
  { code: 20, name: "Tỉnh Lạng Sơn" },
  { code: 22, name: "Tỉnh Quảng Ninh" },
  { code: 24, name: "Tỉnh Bắc Giang" },
  { code: 25, name: "Tỉnh Phú Thọ" },
  { code: 26, name: "Tỉnh Vĩnh Phúc" },
  { code: 27, name: "Tỉnh Bắc Ninh" },
  { code: 30, name: "Tỉnh Hải Dương" },
  { code: 33, name: "Tỉnh Hưng Yên" },
  { code: 34, name: "Tỉnh Thái Bình" },
  { code: 35, name: "Tỉnh Hà Nam" },
  { code: 36, name: "Tỉnh Nam Định" },
  { code: 37, name: "Tỉnh Ninh Bình" },
  { code: 38, name: "Tỉnh Thanh Hóa" },
  { code: 40, name: "Tỉnh Nghệ An" },
  { code: 42, name: "Tỉnh Hà Tĩnh" },
  { code: 44, name: "Tỉnh Quảng Bình" },
  { code: 45, name: "Tỉnh Quảng Trị" },
  { code: 46, name: "Tỉnh Thừa Thiên Huế" },
  { code: 49, name: "Tỉnh Quảng Nam" },
  { code: 51, name: "Tỉnh Quảng Ngãi" },
  { code: 52, name: "Tỉnh Bình Định" },
  { code: 54, name: "Tỉnh Phú Yên" },
  { code: 56, name: "Tỉnh Khánh Hòa" },
  { code: 58, name: "Tỉnh Ninh Thuận" },
  { code: 60, name: "Tỉnh Bình Thuận" },
  { code: 62, name: "Tỉnh Kon Tum" },
  { code: 64, name: "Tỉnh Gia Lai" },
  { code: 66, name: "Tỉnh Đắk Lắk" },
  { code: 67, name: "Tỉnh Đắk Nông" },
  { code: 68, name: "Tỉnh Lâm Đồng" },
  { code: 70, name: "Tỉnh Bình Phước" },
  { code: 72, name: "Tỉnh Tây Ninh" },
  { code: 74, name: "Tỉnh Bình Dương" },
  { code: 75, name: "Tỉnh Đồng Nai" },
  { code: 77, name: "Tỉnh Bà Rịa - Vũng Tàu" },
  { code: 80, name: "Tỉnh Long An" },
  { code: 82, name: "Tỉnh Tiền Giang" },
  { code: 83, name: "Tỉnh Bến Tre" },
  { code: 84, name: "Tỉnh Trà Vinh" },
  { code: 86, name: "Tỉnh Vĩnh Long" },
  { code: 87, name: "Tỉnh Đồng Tháp" },
  { code: 89, name: "Tỉnh An Giang" },
  { code: 91, name: "Tỉnh Kiên Giang" },
  { code: 93, name: "Tỉnh Hậu Giang" },
  { code: 94, name: "Tỉnh Sóc Trăng" },
  { code: 95, name: "Tỉnh Bạc Liêu" },
  { code: 96, name: "Tỉnh Cà Mau" },
];

// Bổ sung đầy đủ các xã/phường mới thành lập hoặc sáp nhập
const NEW_ADMIN_UNITS: Record<number, Ward[]> = {
  1: [
    // TP Hà Nội
    { code: 90001, name: "Xã Đa Phúc" },
    { code: 90002, name: "Phường Hoàn Kiếm" },
    { code: 90003, name: "Phường Cửa Nam" },
    { code: 90004, name: "Phường Ba Đình" },
    { code: 90005, name: "Phường Ngọc Hà" },
    { code: 90006, name: "Phường Giảng Võ" },
    { code: 90007, name: "Phường Hai Bà Trưng" },
    { code: 90008, name: "Phường Khâm Thiên" },
    { code: 90009, name: "Phường Văn Miếu - Quốc Tử Giám" },
    { code: 90010, name: "Phường Phương Liệt" },
    { code: 90011, name: "Phường Hạ Đình" },
    { code: 90012, name: "Phường Kim Giang" },
    { code: 90013, name: "Xã Quảng Oai" },
    { code: 90014, name: "Xã Vật Lại" },
    { code: 90015, name: "Xã Hát Môn" },
    { code: 90016, name: "Xã Tiên Phương" },
    { code: 90017, name: "Xã Dân Hòa" },
  ],
  79: [
    // TP Hồ Chí Minh
    { code: 90101, name: "Phường An Khánh" },
    { code: 90102, name: "Phường Bến Nghé" },
    { code: 90103, name: "Phường Bến Thành" },
    { code: 90104, name: "Phường Đa Kao" },
    { code: 90105, name: "Phường Võ Thị Sáu" },
  ],
};

const cachedProvinces: Province[] = [];
const cachedProvinceWards: Record<number, Ward[]> = {};

// Helper: Phân tích chuỗi địa chỉ có sẵn thành các phần: Tỉnh/TP, Xã/Phường, Số nhà/đường
function parseAddressString(addressStr: string, provinceList: Province[]): {
  province: string;
  ward: string;
  street: string;
} {
  if (!addressStr || addressStr === "Chưa cập nhật") {
    return { province: "", ward: "", street: "" };
  }

  const raw = addressStr.trim();

  // 1. Tìm province từ chuỗi địa chỉ
  let matchedProv = "";
  const sortedProvinces = [...provinceList].sort(
    (a, b) => b.name.length - a.name.length
  );

  for (const prov of sortedProvinces) {
    if (raw.toLowerCase().includes(prov.name.toLowerCase())) {
      matchedProv = prov.name;
      break;
    }
    const shortName = prov.name.replace(/^(Thành phố |Tỉnh )/, "");
    if (raw.toLowerCase().includes(shortName.toLowerCase())) {
      matchedProv = prov.name;
      break;
    }
  }

  if (!matchedProv) {
    return { province: "", ward: "", street: raw };
  }

  // 2. Tách phần trước province
  const provIndex = raw.toLowerCase().lastIndexOf(matchedProv.toLowerCase());
  let beforeProv = provIndex >= 0 ? raw.substring(0, provIndex).trim() : raw;
  beforeProv = beforeProv.replace(/,\s*$/, "");

  const parts = beforeProv
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { province: matchedProv, ward: "", street: "" };
  }
  if (parts.length === 1) {
    return { province: matchedProv, ward: parts[0], street: "" };
  }

  const ward = parts[parts.length - 1];
  const street = parts.slice(0, parts.length - 1).join(", ");
  return { province: matchedProv, ward, street };
}

type VietnamAddressSelectorProps = {
  value: string;
  onChange: (newAddress: string) => void;
  error?: string;
};

export default function VietnamAddressSelector({
  value,
  onChange,
  error,
}: VietnamAddressSelectorProps) {
  const [provinces, setProvinces] = useState<Province[]>(FALLBACK_PROVINCES);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState<string>("");

  // Trạng thái tìm kiếm dropdown Xã/Phường
  const [searchWardInput, setSearchWardInput] = useState<string>("");
  const [isWardDropdownOpen, setIsWardDropdownOpen] = useState<boolean>(false);
  const wardDropdownRef = useRef<HTMLDivElement>(null);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Đóng dropdown khi nhấn ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wardDropdownRef.current &&
        !wardDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWardDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Tự động điền dữ liệu nếu `value` đã có sẵn từ hồ sơ
  useEffect(() => {
    if (!value || value === "Chưa cập nhật") return;

    if (!selectedProvince) {
      const parsed = parseAddressString(value, provinces);
      if (parsed.province) {
        setSelectedProvince(parsed.province);
      }
      if (parsed.ward) {
        setSelectedWard(parsed.ward);
        setSearchWardInput(parsed.ward);
      }
      if (parsed.street) {
        setStreetAddress(parsed.street);
      }
    }
  }, [value, provinces, selectedProvince]);

  // 2. Tải danh sách 63 Tỉnh/Thành phố
  useEffect(() => {
    if (cachedProvinces.length > 0) {
      setProvinces(cachedProvinces);
      return;
    }

    setLoadingProvinces(true);
    fetch("https://provinces.open-api.vn/api/?depth=1")
      .then((res) => res.json())
      .then((data: Province[]) => {
        if (Array.isArray(data) && data.length > 0) {
          cachedProvinces.push(...data);
          setProvinces(data);
        }
      })
      .catch(() => {
        setProvinces(FALLBACK_PROVINCES);
      })
      .finally(() => {
        setLoadingProvinces(false);
      });
  }, []);

  // 3. Tải toàn bộ Xã/Phường của Tỉnh/Thành phố
  useEffect(() => {
    if (!selectedProvince) {
      setWards([]);
      return;
    }

    const provinceObj = provinces.find((p) => p.name === selectedProvince);
    if (!provinceObj) return;

    if (cachedProvinceWards[provinceObj.code]) {
      setWards(cachedProvinceWards[provinceObj.code]);
      return;
    }

    setLoadingWards(true);
    fetch(`https://provinces.open-api.vn/api/p/${provinceObj.code}?depth=3`)
      .then((res) => res.json())
      .then(
        (data: {
          districts?: Array<{
            name: string;
            wards?: Array<{ code: number; name: string }>;
          }>;
        }) => {
          const districtList = data.districts || [];
          const allWards: Ward[] = [];

          districtList.forEach((d) => {
            if (Array.isArray(d.wards)) {
              d.wards.forEach((w) => {
                allWards.push({
                  code: w.code,
                  name: w.name,
                });
              });
            }
          });

          // Bổ sung các xã/phường mới
          const extraUnits = NEW_ADMIN_UNITS[provinceObj.code] || [];
          extraUnits.forEach((unit) => {
            if (!allWards.some((w) => w.name === unit.name)) {
              allWards.push(unit);
            }
          });

          // Sắp xếp theo alphabet tiếng Việt
          allWards.sort((a, b) => a.name.localeCompare(b.name, "vi"));

          cachedProvinceWards[provinceObj.code] = allWards;
          setWards(allWards);
        }
      )
      .catch(() => {
        const fallbackList = NEW_ADMIN_UNITS[provinceObj.code] || [];
        setWards(fallbackList);
      })
      .finally(() => {
        setLoadingWards(false);
      });
  }, [selectedProvince, provinces]);

  // 4. Ghép địa chỉ tự động: [Số nhà/đường], [Xã/Phường], [Tỉnh/TP]
  const updateAddress = (prov: string, wrd: string, street: string) => {
    const parts: string[] = [];
    if (street.trim()) parts.push(street.trim());
    if (wrd.trim()) parts.push(wrd.trim());
    if (prov.trim()) parts.push(prov.trim());

    const combined = parts.join(", ");
    onChange(combined);
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value;
    setSelectedProvince(newProv);
    setSelectedWard("");
    setSearchWardInput("");
    setIsWardDropdownOpen(false);
    updateAddress(newProv, "", streetAddress);
  };

  const handleSelectWard = (wardName: string) => {
    const cleanWard = wardName.trim();
    setSelectedWard(cleanWard);
    setSearchWardInput(cleanWard);
    setIsWardDropdownOpen(false);
    updateAddress(selectedProvince, cleanWard, streetAddress);
  };

  const handleWardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchWardInput(val);
    setSelectedWard(val.trim());
    setIsWardDropdownOpen(true);
    updateAddress(selectedProvince, val.trim(), streetAddress);
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStreet = e.target.value;
    setStreetAddress(newStreet);
    updateAddress(selectedProvince, selectedWard, newStreet);
  };

  // 5. Lọc thông minh theo tên xã/phường (có dấu hoặc không dấu)
  const filteredWards = useMemo(() => {
    if (!searchWardInput.trim()) {
      return wards.slice(0, 60);
    }

    const rawLower = searchWardInput.toLowerCase().trim();
    const toneFree = removeVietnameseTones(searchWardInput);

    return wards
      .filter((w) => {
        const nameRaw = w.name.toLowerCase();
        const nameToneFree = removeVietnameseTones(w.name);
        return nameRaw.includes(rawLower) || nameToneFree.includes(toneFree);
      })
      .slice(0, 60);
  }, [wards, searchWardInput]);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-[#1F2933]">
        Địa chỉ
      </label>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-[#FBFBFA] p-3.5">
        {/* Bước 1: Chọn Tỉnh / Thành phố */}
        <div>
          <label className="text-xs font-semibold text-slate-700">
            Tỉnh / Thành phố <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedProvince}
            onChange={handleProvinceChange}
            disabled={loadingProvinces}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F]"
          >
            <option value="">
              {loadingProvinces
                ? "Đang tải tỉnh thành..."
                : "-- Chọn Tỉnh / Thành phố --"}
            </option>
            {provinces.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bước 2: Tìm kiếm & Chọn Xã / Phường */}
        <div ref={wardDropdownRef} className="relative">
          <label className="text-xs font-semibold text-slate-700">
            Xã / Phường <span className="text-rose-500">*</span>
          </label>

          <div className="relative mt-1">
            <input
              type="text"
              value={searchWardInput}
              disabled={!selectedProvince && provinces.length > 0}
              onFocus={() => {
                if (selectedProvince) {
                  setIsWardDropdownOpen(true);
                }
              }}
              onChange={handleWardInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (searchWardInput.trim()) {
                    handleSelectWard(searchWardInput.trim());
                  }
                }
              }}
              placeholder={
                !selectedProvince
                  ? "Vui lòng chọn Tỉnh/Thành phố trước"
                  : loadingWards
                  ? "Đang tải danh sách xã/phường..."
                  : "Gõ tìm kiếm hoặc chọn xã/phường..."
              }
              className={`w-full rounded-xl border bg-white px-3 py-2.5 text-xs font-medium text-[#20252B] placeholder:text-slate-400 transition focus:outline-none ${
                isWardDropdownOpen
                  ? "border-[#D6A85F] ring-1 ring-[#D6A85F]"
                  : "border-slate-300"
              } disabled:bg-slate-100 disabled:text-slate-400`}
            />

            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchWardInput && (
                <button
                  type="button"
                  title="Xóa để chọn lại"
                  onClick={() => {
                    setSearchWardInput("");
                    setSelectedWard("");
                    updateAddress(selectedProvince, "", streetAddress);
                    setIsWardDropdownOpen(true);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
              {selectedProvince && !loadingWards && (
                <button
                  type="button"
                  onClick={() => setIsWardDropdownOpen(!isWardDropdownOpen)}
                  className="text-slate-400 hover:text-slate-700 text-xs"
                >
                  {isWardDropdownOpen ? "▲" : "▼"}
                </button>
              )}
            </div>
          </div>

          {/* Menu Dropdown hiển thị danh sách xã/phường */}
          {isWardDropdownOpen && selectedProvince && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
              {/* Mục chọn nhanh giá trị vừa gõ nếu chưa có trong danh sách */}
              {searchWardInput.trim().length > 0 &&
                !filteredWards.some(
                  (w) =>
                    w.name.toLowerCase() ===
                    searchWardInput.trim().toLowerCase()
                ) && (
                  <div
                    onClick={() => handleSelectWard(searchWardInput.trim())}
                    className="flex cursor-pointer items-center justify-between rounded-lg bg-[#FAF5EB] px-3 py-2 text-xs text-[#6B4B18] transition hover:bg-[#F3E8D2] border border-[#D6A85F]/40 mb-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#D6A85F]">✓</span>
                      <span className="font-semibold text-[#20252B]">
                        Chọn: "{searchWardInput.trim()}"
                      </span>
                    </div>
                    <span className="text-xs text-[#8B6B38]">Nhấn chọn ↵</span>
                  </div>
                )}

              {/* Danh sách các xã/phường */}
              {filteredWards.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  Không tìm thấy xã/phường nào khớp với từ khóa.
                </div>
              ) : (
                filteredWards.map((w) => {
                  const isSelected = selectedWard === w.name;
                  return (
                    <div
                      key={w.code}
                      onClick={() => handleSelectWard(w.name)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-xs transition ${
                        isSelected
                          ? "bg-[#D6A85F]/20 font-bold text-[#3A3020]"
                          : "text-[#20252B] hover:bg-[#F7F7F5]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            isSelected
                              ? "text-[#D6A85F] font-bold"
                              : "text-slate-300"
                          }
                        >
                          ✓
                        </span>
                        <span className="font-semibold text-slate-800">
                          {w.name}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Bước 3: Số nhà, tên đường / thôn xóm chi tiết */}
        <div>
          <label className="text-xs font-semibold text-slate-700">
            Số nhà, tên đường / thôn xóm
          </label>
          <input
            type="text"
            value={streetAddress}
            onChange={handleStreetChange}
            placeholder="Ví dụ: Thôn Đức Hậu, hoặc Số 36 Phố Dịch Vọng Hậu"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F]"
          />
        </div>

        {/* Địa chỉ hoàn chỉnh tổng hợp */}
        <div className="rounded-xl border border-[#D6A85F]/40 bg-[#FBF8F1] p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[#8B6B38]">
            <span>📍</span>
            <span>Địa chỉ:</span>
          </div>
          <p className="mt-1 font-semibold text-[#1F2933] text-xs">
            {value ? value : "(Chưa chọn đầy đủ địa chỉ)"}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs font-medium text-rose-500">{error}</p>
      )}
    </div>
  );
}

import { useInAppShell } from "../layouts/ShellContext";
import { Link } from "react-router-dom";
import BrandLogo from "./common/BrandLogo";

function Footer() {
  const inShell = useInAppShell();
  if (inShell) return null;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Cột 1: Thông tin thương hiệu */}
          <div className="lg:col-span-1">
            <BrandLogo />

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Hệ thống dịch vụ bảo dưỡng và sửa chữa ô tô tiêu chuẩn. Minh bạch
              chi phí, phụ tùng chính hãng và theo dõi tiến độ thuận tiện.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-600">
                Chứng chỉ kỹ thuật tiêu chuẩn OEM
              </span>
            </div>
          </div>

          {/* Cột 2: Danh mục dịch vụ */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Dịch vụ kỹ thuật
            </p>

            <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
              <li>
                <Link to="/services" className="transition hover:text-slate-900">
                  Bảo dưỡng định kỳ theo số km
                </Link>
              </li>
              <li>
                <Link to="/services" className="transition hover:text-slate-900">
                  Kiểm tra & Láng đĩa phanh
                </Link>
              </li>
              <li>
                <Link to="/services" className="transition hover:text-slate-900">
                  Nội soi & Bảo dưỡng điều hòa
                </Link>
              </li>
              <li>
                <Link to="/services" className="transition hover:text-slate-900">
                  Thay dầu nhớt & Lọc chính hãng
                </Link>
              </li>
              <li>
                <Link to="/services" className="transition hover:text-slate-900">
                  Cân chỉnh góc đặt bánh xe
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Liên kết nhanh & Khách hàng */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Dành cho khách hàng
            </p>

            <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
              <li>
                <Link to="/booking" className="transition hover:text-slate-900">
                  Đặt hẹn dịch vụ trực tuyến
                </Link>
              </li>
              <li>
                <Link to="/login" className="transition hover:text-slate-900">
                  Tra cứu lịch sử bảo dưỡng
                </Link>
              </li>
              <li>
                <Link to="/register" className="transition hover:text-slate-900">
                  Đăng ký tài khoản hội viên
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="transition hover:text-slate-900">
                  Hỗ trợ khôi phục mật khẩu
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 4: Thông tin liên hệ & Giờ hoạt động */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Thông tin liên hệ
            </p>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <div>
                <p className="font-semibold text-slate-800">Hotline hỗ trợ kỹ thuật</p>
                <a
                  href="tel:0332405972"
                  className="mt-0.5 block font-mono text-sm font-semibold text-slate-900 transition hover:text-amber-600"
                >
                  033 240 5972
                </a>
              </div>

              <div>
                <p className="font-semibold text-slate-800">Email tiếp nhận</p>
                <p className="mt-0.5">contact@carservice.vn</p>
              </div>

              <div>
                <p className="font-semibold text-slate-800">Địa chỉ trung tâm</p>
                <p className="mt-0.5">Hà Nội, Việt Nam</p>
              </div>

              <div>
                <p className="font-semibold text-slate-800">Giờ phục vụ</p>
                <p className="mt-0.5">Thứ 2 - Thứ 7: 08:00 - 18:00</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bản quyền và chính sách */}
        <div className="mt-10 flex flex-col gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 CarService. Tất cả các quyền được bảo lưu.</p>

          <div className="flex items-center gap-6">
            <Link to="/" className="transition hover:text-slate-600">
              Chính sách bảo mật
            </Link>
            <Link to="/" className="transition hover:text-slate-600">
              Điều khoản dịch vụ
            </Link>
            <Link to="/" className="transition hover:text-slate-600">
              Chính sách bảo hành phụ tùng
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
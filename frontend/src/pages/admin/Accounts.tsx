import AdminHubNav from "../../components/AdminHubNav";
import { useMemo, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

type AccountRole = "Cố vấn dịch vụ" | "Kỹ thuật viên" | "Quản trị viên";
type AccountStatus = "Hoạt động" | "Khóa";

type Account = {
  id: number;
  name: string;
  username: string;
  role: AccountRole;
  status: AccountStatus;
  phone: string;
};

const initialAccounts: Account[] = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    username: "nguyenvana",
    role: "Cố vấn dịch vụ",
    status: "Hoạt động",
    phone: "0901 234 567",
  },
  {
    id: 2,
    name: "Trần Thị B",
    username: "tranthib",
    role: "Kỹ thuật viên",
    status: "Hoạt động",
    phone: "0912 345 678",
  },
  {
    id: 3,
    name: "Lê Văn C",
    username: "levanc",
    role: "Kỹ thuật viên",
    status: "Khóa",
    phone: "0987 654 321",
  },
];

const roles: AccountRole[] = [
  "Cố vấn dịch vụ",
  "Kỹ thuật viên",
  "Quản trị viên",
];

function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tất cả vai trò");
  const [statusFilter, setStatusFilter] = useState("Tất cả trạng thái");
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AccountRole>("Cố vấn dịch vụ");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredAccounts = useMemo(() => {
    const normalizedKeyword = searchText.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesKeyword =
        account.name.toLowerCase().includes(normalizedKeyword) ||
        account.username.toLowerCase().includes(normalizedKeyword) ||
        account.phone.toLowerCase().includes(normalizedKeyword);

      const matchesRole =
        roleFilter === "Tất cả vai trò" || account.role === roleFilter;

      const matchesStatus =
        statusFilter === "Tất cả trạng thái" ||
        account.status === statusFilter;

      return matchesKeyword && matchesRole && matchesStatus;
    });
  }, [accounts, searchText, roleFilter, statusFilter]);

  const activeCount = accounts.filter(
    (account) => account.status === "Hoạt động",
  ).length;

  const lockedCount = accounts.filter(
    (account) => account.status === "Khóa",
  ).length;

  const employeeCount = accounts.filter(
    (account) => account.role !== "Quản trị viên",
  ).length;

  const resetForm = () => {
    setName("");
    setUsername("");
    setPhone("");
    setRole("Cố vấn dịch vụ");
    setEditingAccount(null);
    setShowForm(false);
    setError("");
  };

  const openCreateForm = () => {
    resetForm();
    setMessage("");
    setShowForm(true);
  };

  const openRoleForm = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setUsername(account.username);
    setPhone(account.phone);
    setRole(account.role);
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedUsername = username.trim();

    if (
      accounts.some(
        (account) =>
          account.username.toLowerCase() === normalizedUsername.toLowerCase() &&
          account.id !== editingAccount?.id,
      )
    ) {
      setError("Tên tài khoản đã tồn tại.");
      return;
    }

    if (editingAccount) {
      setAccounts((current) =>
        current.map((account) =>
          account.id === editingAccount.id
            ? {
                ...account,
                name: name.trim(),
                username: normalizedUsername,
                phone: phone.trim(),
                role,
              }
            : account,
        ),
      );
      setMessage("Cập nhật tài khoản và phân quyền thành công.");
    } else {
      const newAccount: Account = {
        id: Math.max(0, ...accounts.map((account) => account.id)) + 1,
        name: name.trim(),
        username: normalizedUsername,
        phone: phone.trim(),
        role,
        status: "Hoạt động",
      };

      setAccounts((current) => [...current, newAccount]);
      setMessage("Tạo tài khoản thành công.");
    }

    resetForm();
  };

  const toggleStatus = (account: Account) => {
    const nextStatus: AccountStatus =
      account.status === "Hoạt động" ? "Khóa" : "Hoạt động";

    setAccounts((current) =>
      current.map((item) =>
        item.id === account.id ? { ...item, status: nextStatus } : item,
      ),
    );

    setMessage(
      `${nextStatus === "Khóa" ? "Đã khóa" : "Đã mở khóa"} tài khoản ${account.username}.`,
    );
    setError("");
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchText(keyword);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />

      <div className="lg:ml-[250px]">
        <AdminTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
                KHÔNG GIAN LÀM VIỆC / QUẢN TRỊ VIÊN
              </p>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-white">
                  AD
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-[#20252B]">
                    Quản trị viên
                  </h1>
                  <p className="mt-1 text-xs text-[#66717C]">
                    Quản lý tài khoản người dùng và phân quyền nhân viên.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Tổng tài khoản",
                  value: accounts.length,
                  description: "Tài khoản trong danh sách",
                },
                {
                  label: "Đang hoạt động",
                  value: activeCount,
                  description: "Tài khoản đang sử dụng",
                },
                {
                  label: "Nhân viên",
                  value: employeeCount,
                  description: "Cố vấn và kỹ thuật viên",
                },
                {
                  label: "Đang khóa",
                  value: lockedCount,
                  description: "Tài khoản bị khóa",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E1E4E6] bg-white p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                    {item.label}
                  </p>
                  <p className="mt-4 text-2xl font-bold text-[#20252B]">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <AdminHubNav />

            {message && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#D9E8D8] bg-[#F0F7EF] px-4 py-3 text-xs text-[#315B35]">
                <p>{message}</p>
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className="font-bold"
                >
                  Đóng
                </button>
              </div>
            )}

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-6">
              <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    GARA / TÀI KHOẢN & NHÂN VIÊN
                  </p>
                  <h2 className="mt-1 text-base font-bold text-[#20252B]">
                    Tìm kiếm tài khoản & nhân viên
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="cs-btn cs-btn-primary"
                >
                  + Tạo tài khoản
                </button>
              </div>

              <form onSubmit={handleSearch}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Tên, tài khoản hoặc số điện thoại..."
                    className="min-w-0 rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#1F2933]"
                  />

                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#1F2933]"
                  >
                    <option>Tất cả vai trò</option>
                    {roles.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#1F2933]"
                  >
                    <option>Tất cả trạng thái</option>
                    <option>Hoạt động</option>
                    <option>Khóa</option>
                  </select>

                  <button
                    type="submit"
                    className="cs-btn cs-btn-primary"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#8A949E]">
                  Tìm kiếm và lọc danh sách theo thông tin hiện có.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setKeyword("");
                    setSearchText("");
                    setRoleFilter("Tất cả vai trò");
                    setStatusFilter("Tất cả trạng thái");
                  }}
                  className="text-xs font-semibold text-[#66717C] underline underline-offset-4 hover:text-[#20252B]"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>

            {showForm && (
              <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      ACCOUNT SETTINGS
                    </p>
                    <h2 className="mt-1 text-base font-bold">
                      {editingAccount ? "Phân quyền tài khoản" : "Tạo tài khoản mới"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-[#D9DDE1] px-3 py-2 text-xs hover:bg-[#F7F7F5]"
                  >
                    Đóng
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold">
                      Họ và tên
                    </label>
                    <input
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Nhập họ và tên"
                      className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-xs outline-none focus:border-[#1F2933]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold">
                      Tên tài khoản
                    </label>
                    <input
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Nhập tên tài khoản"
                      className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-xs outline-none focus:border-[#1F2933]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold">
                      Số điện thoại
                    </label>
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Nhập số điện thoại"
                      className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-xs outline-none focus:border-[#1F2933]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold">
                      Vai trò
                    </label>
                    <select
                      value={role}
                      onChange={(event) =>
                        setRole(event.target.value as AccountRole)
                      }
                      className="w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#1F2933]"
                    >
                      {roles.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 md:col-span-2">{error}</p>
                  )}

                  <div className="flex flex-wrap gap-3 md:col-span-2">
                    <button
                      type="submit"
                      className="cs-btn cs-btn-primary"
                    >
                      {editingAccount ? "Lưu phân quyền" : "Tạo tài khoản"}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-[#D9DDE1] px-5 py-3 text-xs font-semibold hover:bg-[#F7F7F5]"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col justify-between gap-2 border-b border-[#EEF0F2] px-6 py-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    ACCOUNT MANAGEMENT
                  </p>
                  <h2 className="mt-1 text-base font-bold text-[#20252B]">
                    Danh sách tài khoản & nhân viên
                  </h2>
                </div>
                <p className="text-xs text-[#8A949E]">
                  {filteredAccounts.length} / {accounts.length} kết quả
                </p>
              </div>

              {filteredAccounts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-[#20252B]">
                    Không tìm thấy tài khoản
                  </p>
                  <p className="mt-2 text-xs text-[#8A949E]">
                    Hãy thử thay đổi từ khóa hoặc bộ lọc.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#EEF0F2]">
                  {filteredAccounts.map((account, index) => (
                    <div
                      key={account.id}
                      className="p-5 transition hover:bg-[#F7F7F5]"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-xs font-bold text-white">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#20252B]">
                              {account.name}
                            </p>
                            <p className="mt-1 text-xs text-[#8A949E]">
                              {account.phone}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-[#8A949E]">TÀI KHOẢN</p>
                          <p className="mt-1 text-xs font-semibold text-[#20252B]">
                            {account.username}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#8A949E]">VAI TRÒ</p>
                          <p className="mt-1 text-xs font-semibold text-[#20252B]">
                            {account.role}
                          </p>
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                              account.status === "Hoạt động"
                                ? "bg-[#F3E8D2] text-[#3A3020]"
                                : "bg-[#F3F4F2] text-[#66717C]"
                            }`}
                          >
                            {account.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openRoleForm(account)}
                            className="rounded-xl border border-[#D9DDE1] px-4 py-2 text-xs font-semibold text-[#20252B] transition hover:bg-[#F3F4F2]"
                          >
                            Phân quyền
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(account)}
                            className="rounded-xl border border-[#D9DDE1] px-4 py-2 text-xs font-semibold text-[#20252B] transition hover:bg-[#F3F4F2]"
                          >
                            {account.status === "Hoạt động" ? "Khóa" : "Mở khóa"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Accounts;
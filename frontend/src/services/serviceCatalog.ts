export type ServiceProduct = {
  id: string;
  title: string;
  description: string;
  price: string;
  backendServiceName: string;
  icon: string;
  iconColor: string;
  time?: string;
};

export const SERVICE_PRODUCTS: ServiceProduct[] = [
  {
    id: "std-maintenance",
    title: "Bảo dưỡng định kỳ",
    description:
      "Kiểm tra và bảo dưỡng xe theo định kỳ để xe luôn hoạt động ổn định.",
    price: "Từ 500.000 đ",
    backendServiceName: "Bảo dưỡng định kỳ",
    icon: "fa-solid fa-wrench",
    iconColor: "text-blue-600",
  },
  {
    id: "oil-filter",
    title: "Thay dầu động cơ",
    description:
      "Thay dầu động cơ và kiểm tra các bộ phận liên quan đến hệ thống bôi trơn.",
    price: "Từ 350.000 đ",
    backendServiceName: "Thay dầu động cơ",
    icon: "fa-solid fa-oil-can",
    iconColor: "text-amber-500",
  },
  {
    id: "brake-check",
    title: "Kiểm tra phanh",
    description:
      "Kiểm tra má phanh, đĩa phanh và hệ thống phanh để đảm bảo an toàn.",
    price: "Từ 300.000 đ",
    backendServiceName: "Kiểm tra tổng quát",
    icon: "fa-solid fa-car-burst",
    iconColor: "text-red-500",
  },
  {
    id: "air-conditioning-check",
    title: "Kiểm tra điều hòa",
    description:
      "Kiểm tra hệ thống điều hòa và xử lý các vấn đề về làm mát trong xe.",
    price: "Từ 400.000 đ",
    backendServiceName: "Kiểm tra tổng quát",
    icon: "fa-solid fa-snowflake",
    iconColor: "text-cyan-500",
  },
  {
    id: "engine-check",
    title: "Kiểm tra động cơ",
    description:
      "Kiểm tra tổng quát động cơ và phát hiện các vấn đề cần sửa chữa.",
    price: "Từ 600.000 đ",
    backendServiceName: "Kiểm tra tổng quát",
    icon: "fa-solid fa-engine",
    iconColor: "text-emerald-600",
  },
  {
    id: "detailing-spa",
    title: "Chăm sóc xe",
    description:
      "Vệ sinh và chăm sóc tổng thể giúp xe sạch sẽ và giữ được tình trạng tốt.",
    price: "Từ 300.000 đ",
    backendServiceName: "Kiểm tra tổng quát",
    icon: "fa-solid fa-spray-can-sparkles",
    iconColor: "text-purple-500",
  },
];
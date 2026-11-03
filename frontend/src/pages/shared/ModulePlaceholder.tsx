import { Link } from "react-router-dom";
import { Card, EmptyState, PageHeading } from "../../components/ui";

type Props = { area: "Cố vấn" | "Quản trị" | "Khách hàng"; title: string; description: string; owner: string };
export default function ModulePlaceholder({ area, title, description, owner }: Props) {
  return <div className="cs-placeholder">
    <PageHeading eyebrow={`CARSERVICE / ${area.toUpperCase()}`} title={title} description={description}/>
    <EmptyState title="Khung module sẵn sàng tích hợp" description="Đây là trang khung của Task 01. Chưa kết nối API hoặc hiển thị dữ liệu giả.">
      <span className="cs-pill">Phụ trách module: {owner}</span>
    </EmptyState>
    <Card><h2 className="cs-card-title">Dành cho thành viên phụ trách</h2><p className="cs-card-note">Tích hợp component của bạn vào route này, dùng Axios Client chung, kiểm tra role và chính sách Backend trước khi gọi API.</p><Link className="cs-text-link" to="/">Về trang chủ →</Link></Card>
  </div>;
}

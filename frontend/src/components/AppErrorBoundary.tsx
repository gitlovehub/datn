import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = { children: ReactNode };
type State = { crashed: boolean };
/** Last-resort screen: a failed module must never leave a white page. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };
  static getDerivedStateFromError(): State { return { crashed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("CarService render error:", error, info.componentStack);
  }
  render() {
    if (!this.state.crashed) return this.props.children;
    return <main role="alert" style={{ minHeight:"75vh",display:"grid",placeItems:"center",background:"#f7f7f6",padding:"32px",fontFamily:"Manrope,system-ui,sans-serif",color:"#242424" }}>
      <section style={{ background:"white",border:"1px solid #eae7e6",borderRadius:"20px",maxWidth:"560px",padding:"36px",boxShadow:"0 18px 40px #0000000c" }}>
        <span style={{ fontSize:12,fontWeight:800,letterSpacing:".1em",color:"#cf2935" }}>CARSERVICE / THÔNG BÁO</span>
        <h1 style={{ fontSize:26,fontWeight:800,margin:"16px 0 12px" }}>Không thể hiển thị trang này</h1>
        <p style={{ color:"#666",lineHeight:1.8,marginBottom:20 }}>Một thành phần giao diện gặp lỗi. Thử tải lại trang; nếu vấn đề còn xảy ra, hãy mở Console và gửi thông tin lỗi cho nhóm Frontend.</p>
        <button style={{ background:"#cf2935",color:"white",border:0,borderRadius:9,padding:"11px 18px",fontWeight:800,cursor:"pointer",marginRight:12 }} onClick={() => window.location.reload()}>Tải lại trang</button>
        <Link to="/" onClick={() => this.setState({ crashed:false })} style={{ color:"#cf2935",fontWeight:800 }}>Về trang chủ</Link>
      </section>
    </main>;
  }
}

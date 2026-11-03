<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mã xác thực tài khoản CarService</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden;" cellspacing="0" cellpadding="0">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #1F2933; padding: 28px 32px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">
                                Car<span style="color: #D6A85F;">Service</span>
                            </h1>
                            <p style="margin: 6px 0 0; font-size: 13px; color: #AEB8C1;">Hệ thống chăm sóc & dịch vụ sửa chữa xe</p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 32px;">
                            <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #20252B;">
                                Xác thực tài khoản của bạn
                            </h2>
                            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #52606D;">
                                Cảm ơn bạn đã đăng ký tài khoản tại <strong>CarService</strong>. Vui lòng sử dụng mã xác thực (OTP) bên dưới để hoàn tất quá trình kích hoạt tài khoản:
                            </p>

                            <!-- OTP Box -->
                            <div style="background-color: #F4F6F8; border: 2px dashed #D6A85F; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                                <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1F2933; font-family: 'Courier New', Courier, monospace;">
                                    {{ $otp }}
                                </div>
                                <p style="margin: 8px 0 0; font-size: 12px; color: #7B8794;">
                                    Mã OTP có hiệu lực trong vòng <strong>5 phút</strong>
                                </p>
                            </div>

                            <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #7B8794;">
                                ⚠️ Nếu bạn không thực hiện yêu cầu đăng ký này, vui lòng bỏ qua email hoặc liên hệ với chúng tôi để được hỗ trợ. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F8F9FA; border-top: 1px solid #E1E4E6; padding: 20px 32px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #9AA5B1;">
                                &copy; {{ date('Y') }} CarService. Mọi quyền được bảo lưu.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailVerificationOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $otp
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Mã xác thực tài khoản CarService',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.email-verification-otp',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
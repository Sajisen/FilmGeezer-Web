declare module "qrcode" {
  interface QRCodeOptions {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  interface QRCodeModule {
    toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
  }

  const QRCode: QRCodeModule;
  export default QRCode;
}

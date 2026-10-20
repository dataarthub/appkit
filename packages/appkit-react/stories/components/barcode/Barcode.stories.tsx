import type { Meta, StoryObj } from '@storybook/react-vite';
import { BarcodeGenerator } from '../../../src/tools/components/barcode/BarcodeGenerator';
import { QRCodeGenerator } from '../../../src/tools/components/barcode/QRCodeGenerator';

const meta = {
  title: 'Components/Barcode',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Generate barcodes and QR codes from supplied values.

## Features
- Barcode formats including CODE128, EAN13, UPC and CODE39
- QR codes from URLs or text
- Feature peers: \`jsbarcode\`, \`react-qr-code\`

## Required setup

Install jsbarcode for barcodes and react-qr-code for QR codes. These generation stories do not require the optional camera scanner peer. Import @alneas/appkit-react/styles once in the host application; the Storybook preview supplies it here.

## Public import
\`\`\`tsx
import { BarcodeGenerator, QRCodeGenerator } from '@alneas/appkit-react/tools/barcode';
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;

// BarcodeGenerator Stories
export const BarcodeDefault: StoryObj<typeof BarcodeGenerator> = {
  render: () => (
    <BarcodeGenerator
      value="4901234567894"
      format="EAN13"
      title="商品バーコード"
      description="EAN13形式"
    />
  ),
  name: 'Barcode - EAN13',
};

export const BarcodeCODE128: StoryObj<typeof BarcodeGenerator> = {
  render: () => (
    <BarcodeGenerator
      value="ABC-12345"
      format="CODE128"
      title="CODE128"
      description="英数字対応"
    />
  ),
  name: 'Barcode - CODE128',
};

export const BarcodeCODE39: StoryObj<typeof BarcodeGenerator> = {
  render: () => (
    <BarcodeGenerator
      value="HELLO123"
      format="CODE39"
      title="CODE39"
    />
  ),
  name: 'Barcode - CODE39',
};

export const BarcodeNoValue: StoryObj<typeof BarcodeGenerator> = {
  render: () => (
    <BarcodeGenerator
      value="12345"
      format="CODE128"
      displayValue={false}
      title="値なし"
    />
  ),
  name: 'Barcode - No Value Display',
};

// QRCodeGenerator Stories
export const QRCodeDefault: StoryObj<typeof QRCodeGenerator> = {
  render: () => (
    <QRCodeGenerator
      value="https://example.com"
      title="サイトにアクセス"
      description="スキャンしてサイトを開く"
    />
  ),
  name: 'QR Code - Default',
};

export const QRCodeText: StoryObj<typeof QRCodeGenerator> = {
  render: () => (
    <QRCodeGenerator
      value="MECARD:N:山田,太郎;TEL:09012345678;EMAIL:test@example.com;;"
      title="連絡先QR"
      description="名刺代わり"
    />
  ),
  name: 'QR Code - Contact',
};

export const QRCodeURL: StoryObj<typeof QRCodeGenerator> = {
  render: () => (
    <QRCodeGenerator
      value="https://github.com/dataarthub/react-tools"
      title="GitHub"
    />
  ),
  name: 'QR Code - URL',
};

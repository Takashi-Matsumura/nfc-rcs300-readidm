# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application for reading IDm (unique identifier) from NFC cards using the SONY RC-S300 USB NFC reader. The project utilizes third-party JavaScript code from 有限会社さくらシステム (Sakura System Co.) created by 近藤秀尚 (Kondo Hidenao).

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

### NFC Module Structure

The NFC functionality is organized in `app/lib/nfc/`:

- `rcs300.mjs` - Main NFC reader interface with `getIDmStr()` function that handles USB device communication
- `deviceConfig.mjs` - USB device filters and model mappings for RC-S300/380 variants
- `utils.mjs` - Utility functions for data conversion and timing

### USB Communication Flow

1. Device detection and pairing via WebUSB API
2. USB interface claiming and endpoint configuration
3. Binary command sequence transmission to RC-S300
4. Response parsing to extract 8-byte IDm from NFC card data
5. Automatic device cleanup and error handling

### Frontend Architecture

- Single page application (`app/page.tsx`) with client-side NFC reading
- Uses React hooks for state management of IDm display
- Tailwind CSS for styling with responsive design
- TypeScript with strict mode enabled

## Important Notes

- WebUSB API requires HTTPS in production environments
- NFC reader must be connected and paired before use
- Uses `.mjs` extensions for NFC modules to handle mixed ESM/CommonJS compatibility
- IDm is returned as space-separated hex string format (e.g., "01 02 03 04 05 06 07 08")
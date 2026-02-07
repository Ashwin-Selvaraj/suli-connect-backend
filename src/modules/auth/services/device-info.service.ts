import { Request } from 'express';
import { deviceInfoSchema, type DeviceInfo } from '../dtos/device-info.dto';

/** Extract device info from request */
export function getDeviceInfo(req: Request): DeviceInfo {
  return deviceInfoSchema.parse({
    userAgent: req.headers['user-agent'],
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
  });
}

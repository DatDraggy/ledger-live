import { getEnv } from "@ledgerhq/live-env";
import { Id } from "@ledgerhq/types-live";
import { version } from "../../../../package.json";
import { ManagerApiHttpRepository } from "../../../device-core/repositories/ManagerApiRepository";

export type FetchLatestFirmwareUseCaseParams = {
  current_se_firmware_final_version: Id;
  device_version: Id;
  provider: number;
  managerApiRepository: ManagerApiHttpRepository;
};

export default function fetchLatestFirmwareUseCase({
  current_se_firmware_final_version,
  device_version,
  provider,
  managerApiRepository = new ManagerApiHttpRepository(getEnv("MANAGER_API_BASE"), version),
}: FetchLatestFirmwareUseCaseParams) {
  return managerApiRepository.fetchLatestFirmware({
    current_se_firmware_final_version,
    device_version,
    providerId: provider,
    userId: getEnv("USER_ID"),
  });
}

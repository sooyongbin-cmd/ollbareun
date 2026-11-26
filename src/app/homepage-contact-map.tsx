import {
  DEFAULT_COMPANY_ADDRESS,
  DEFAULT_COMPANY_MAP_COORDINATES,
  type CompanyMapCoordinates,
} from "@/lib/company-address";
import styles from "./page.module.css";

export default function HomepageContactMap({
  address = DEFAULT_COMPANY_ADDRESS,
  coordinates = DEFAULT_COMPANY_MAP_COORDINATES,
}: {
  address?: string;
  coordinates?: CompanyMapCoordinates;
}) {
  const companyAddress = address.trim() || DEFAULT_COMPANY_ADDRESS;
  const query = new URLSearchParams({
    address: companyAddress,
    coordinates: `${coordinates.latitude},${coordinates.longitude}`,
  });

  return (
    <div className={styles.map}>
      <iframe
        title={`${companyAddress} 올바름 본사 위치 지도`}
        className={styles.mapCanvas}
        src={`/about/map?${query}`}
      />
    </div>
  );
}

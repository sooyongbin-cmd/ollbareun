import { getPublicCompanyAddress, getPublicMapCoordinates } from "@/lib/public-company-address";
import HomepageHeader from "../homepage-header";
import { HomepageCompanyAddressProvider } from "../homepage-company-address";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const companyAddress = await getPublicCompanyAddress();
  const mapCoordinates = await getPublicMapCoordinates();

  return (
    <div className={`${styles.site} ${styles.publicSite}`}>
      <HomepageHeader />
      <HomepageCompanyAddressProvider companyAddress={companyAddress} mapCoordinates={mapCoordinates}>
        {children}
      </HomepageCompanyAddressProvider>
    </div>
  );
}

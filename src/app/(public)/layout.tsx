import HomepageHeader from "../homepage-header";
import styles from "../page.module.css";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.site}>
      <HomepageHeader />
      {children}
    </div>
  );
}

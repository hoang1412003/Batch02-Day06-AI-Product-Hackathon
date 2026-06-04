import Link from 'next/link';
import styles from './Home.module.css';

export default function Home() {
  return (
    <>
      <div className={styles.header}>
        <div className={styles.topBar}>
          <span>09:54</span>
          <span>📶 🔋</span>
        </div>
        
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          Hỏi và tìm kiếm bất cứ điều gì
        </div>

        <div className={styles.gridMenu}>
          <div className={styles.menuItem}>
            <div className={styles.menuIcon}>➡️</div>
            <span>Nạp/Rút</span>
          </div>
          <div className={styles.menuItem}>
            <div className={styles.menuIcon}>💲</div>
            <span>Nhận tiền</span>
          </div>
          <div className={styles.menuItem}>
            <div className={styles.menuIcon}>📱</div>
            <span>QR Thanh toán</span>
          </div>
          <div className={styles.menuItem}>
            <div className={styles.menuIcon}>🏦</div>
            <span>Ví tiện ích</span>
          </div>
        </div>
      </div>

      {/* Correction Path 2: Đưa AI Oni ra vị trí dễ thấy */}
      <div className={styles.aiShortcutContainer}>
        <div className={styles.aiHeader}>
          <div className={styles.aiAvatar}>AI</div>
          <div>
            <div className={styles.aiTitle}>Trợ thủ AI - Moni</div>
            <div className={styles.aiSubtitle}>Hỏi đáp & Quản lý tài chính</div>
          </div>
        </div>
        <div className={styles.promptChips}>
          <Link href="/chat?prompt=Phân loại chi tiêu hôm nay" className={styles.chip}>
            Phân loại chi tiêu
          </Link>
          <Link href="/chat?prompt=Tổng chi tiêu tháng này là bao nhiêu?" className={styles.chip}>
            Tổng chi tiêu tháng này?
          </Link>
          <Link href="/chat" className={styles.chip}>
            Trò chuyện với Moni
          </Link>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sectionTitle}>Sự kiện đang diễn ra</div>
        <div style={{ height: '120px', background: 'linear-gradient(90deg, #FF512F 0%, #DD2476 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
          Siêu hoàn tiền 6.6
        </div>
      </div>

      <div className={styles.bottomNav}>
        <div className={`${styles.navItem} ${styles.active}`}>
          <span style={{ fontSize: '20px' }}>🏠</span>
          <span>MoMo</span>
        </div>
        <div className={styles.navItem}>
          <span style={{ fontSize: '20px' }}>🎁</span>
          <span>Ưu đãi</span>
        </div>
        <div className={styles.navItem}>
          <div className={styles.scanButton}>
            <span style={{ fontSize: '24px' }}>📷</span>
          </div>
          <span>Quét mọi QR</span>
        </div>
        <Link href="/history" className={styles.navItem} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontSize: '20px' }}>🕒</span>
          <span>Lịch sử GD</span>
        </Link>
        <div className={styles.navItem}>
          <span style={{ fontSize: '20px' }}>👤</span>
          <span>Tôi</span>
        </div>
      </div>
    </>
  );
}

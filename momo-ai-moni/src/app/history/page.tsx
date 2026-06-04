"use client";

import Link from 'next/link';
import { mockTransactions } from '@/mock/database';
import styles from './History.module.css';

export default function HistoryPage() {
  // Tính tổng chi tiêu
  const totalExpense = mockTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Format tiền tệ
  const formatMoney = (amount: number) => {
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  // Hàm chọn icon dựa vào từ khóa trong description
  const getIcon = (desc: string) => {
    const text = desc.toLowerCase();
    if (text.includes('thuê phòng') || text.includes('điện') || text.includes('internet')) return '🏠';
    if (text.includes('ăn') || text.includes('cà phê') || text.includes('nước')) return '🍔';
    if (text.includes('siêu thị') || text.includes('mua') || text.includes('shopee')) return '🛒';
    if (text.includes('taxi') || text.includes('bus') || text.includes('xe')) return '🚕';
    if (text.includes('thuốc') || text.includes('khám') || text.includes('bệnh viện') || text.includes('xét nghiệm')) return '🏥';
    if (text.includes('gym') || text.includes('chứng khoán') || text.includes('tiết kiệm')) return '🏦';
    return '💳';
  };

  // Đảo ngược danh sách để giao dịch mới nhất (id lớn) lên đầu
  const sortedTransactions = [...mockTransactions].reverse();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.topBar}>
          <span>09:54</span>
          <span>📶 🔋</span>
        </div>
      </div>
      
      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          Tìm kiếm giao dịch
        </div>
        <div className={styles.filterIcon}>
          <span>▽</span>
        </div>
      </div>

      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <span>Tổng quan tháng 6</span>
          <span>›</span>
        </div>
        <div className={styles.overviewStats}>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>Tổng chi</div>
            <div className={styles.statValue}>{formatMoney(totalExpense)}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>So với cùng kỳ</div>
            <div className={styles.statValue} style={{color: 'var(--text-secondary)'}}>-- Không đổi ›</div>
          </div>
        </div>
        <div className={styles.budgetWarning}>
          <div className={styles.budgetIcon}>🍔</div>
          <div>
            <div className={styles.budgetTitle}>Ngân sách Ăn uống</div>
            <div className={styles.budgetStatus}>Đang ổn định</div>
          </div>
          <div style={{marginLeft: 'auto'}}>›</div>
        </div>
      </div>

      <div className={styles.transactionsSection}>
        <div className={styles.sectionTitle}>Giao dịch gần đây</div>
        
        <div className={styles.monthGroup}>
          <div className={styles.monthTitle}>Tháng 6/2026</div>
          
          {sortedTransactions.map(t => (
            <div key={t.id} className={styles.transactionItem}>
              <div className={styles.transactionIcon}>{getIcon(t.description)}</div>
              <div className={styles.transactionInfo}>
                <div className={styles.transactionTitle}>
                  {t.recipient.includes('Thanh toán') || t.recipient.includes('Chuyển tiền') || t.recipient.includes('Mua') ? t.recipient : `Thanh toán ${t.recipient}`}
                </div>
                <div className={styles.transactionTime}>
                  {t.date.split('-').reverse().join('/')} - {t.description}
                </div>
                <div className={`${styles.categoryTag} ${!t.category ? styles.empty : ''}`}>
                  📋 {t.category || 'Chưa phân loại'}
                </div>
              </div>
              <div className={styles.transactionAmount}>
                -{formatMoney(t.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation Menu */}
      <div className={styles.bottomNav}>
        <Link href="/" className={styles.navItem} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontSize: '20px' }}>🏠</span>
          <span>MoMo</span>
        </Link>
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
        <Link href="/history" className={`${styles.navItem} ${styles.active}`} style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '20px' }}>🕒</span>
          <span>Lịch sử GD</span>
        </Link>
        <div className={styles.navItem}>
          <span style={{ fontSize: '20px' }}>👤</span>
          <span>Tôi</span>
        </div>
      </div>
    </div>
  );
}

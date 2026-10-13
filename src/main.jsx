import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './style.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {error: null};
  }

  static getDerivedStateFromError(error) {
    return {error};
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-error" dir="rtl">
        <img src={`${import.meta.env.BASE_URL}icon-144.png`} alt="" />
        <h1>اجرای برنامه با مشکل روبه‌رو شد</h1>
        <p>برنامه را یک‌بار ببندید و دوباره باز کنید. اطلاعات نشان‌ها و تنظیمات شما حذف نمی‌شود.</p>
        <button onClick={() => location.reload()}>اجرای دوباره</button>
      </main>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

import { useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';

const TABS = ['Thông tin chung', 'Giá vé', 'Thông báo', 'Bảo mật'];

const Settings = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (<>
    <PageMeta title="Cài đặt | CineAdmin"/>
    <PageBreadCrumb pageTitle="Cài đặt hệ thống" items={[{label:'Cài đặt'}]}/>

    {/* Tabs */}
    <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
      <nav className="flex gap-1 -mb-px">
        {TABS.map((tab,i) => (
          <button key={i} onClick={()=>setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${activeTab===i ? 'border-brand-500 text-brand-500 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}>
            {tab}
          </button>
        ))}
      </nav>
    </div>

    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        {activeTab === 0 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Thông tin rạp phim</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tên hệ thống</label><input className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white/90" defaultValue="CineAdmin"/></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email liên hệ</label><input className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white/90" defaultValue="admin@cineadmin.vn"/></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Hotline</label><input className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white/90" defaultValue="1900-CINE"/></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Múi giờ</label><input className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white/90" defaultValue="Asia/Ho_Chi_Minh"/></div>
            </div>
          </div>
        )}
        {activeTab === 1 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Cấu hình giá vé</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Giá vé thường</label><input type="number" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white/90" defaultValue={75000}/></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Giá vé VIP (x1.5)</label><input type="number" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white/90" defaultValue={112500}/></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Giá vé Couple (x2)</label><input type="number" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white/90" defaultValue={150000}/></div>
            </div>
          </div>
        )}
        {activeTab === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Cài đặt thông báo</h3>
            {['Thông báo đặt vé mới','Cảnh báo doanh thu thấp','Email nhắc lịch chiếu','Thông báo suất chiếu sold-out'].map((item,i) => (
              <label key={i} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                <div className="relative"><input type="checkbox" defaultChecked={i<2} className="sr-only peer"/><div className="h-6 w-11 rounded-full bg-gray-300 peer-checked:bg-brand-500 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5 cursor-pointer dark:bg-gray-600"/></div>
              </label>
            ))}
          </div>
        )}
        {activeTab === 3 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Bảo mật</h3>
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Thời gian giữ ghế (phút)</label><input type="number" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white/90" defaultValue={10}/></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Số lần đặt vé tối đa / ngày / user</label><input type="number" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white/90" defaultValue={5}/></div>
          </div>
        )}
        <div className="mt-6 flex justify-end"><Button>Lưu cài đặt</Button></div>
      </div>
    </div>
  </>);
};
export default Settings;

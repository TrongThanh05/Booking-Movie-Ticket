import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';
import InputField from '../../components/ui/input/InputField';
import { api } from '../../lib/api';

const TheaterForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'', location:'', address:'', phone:'', email:'', totalRooms:1 });

  useEffect(() => {
    if (isEdit) api.get(`/theaters/${id}`).then(r => { const t=r.data; setForm({ name:t.name||'', location:t.location||'', address:t.address||'', phone:t.phone||'', email:t.email||'', totalRooms:t.totalRooms||1 }); }).catch(console.error);
  }, [id, isEdit]);

  const handleChange = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { if(isEdit) await api.put(`/theaters/${id}`,form); else await api.post('/theaters',form); navigate('/admin/theaters'); }
    catch(err){console.error(err)} finally{setLoading(false)}
  };

  return (<>
    <PageMeta title={`${isEdit?'Sửa':'Thêm'} Rạp | CineAdmin`}/>
    <PageBreadCrumb pageTitle={isEdit?'Sửa rạp':'Thêm rạp mới'} items={[{label:'Cụm Rạp',path:'/admin/theaters'},{label:isEdit?'Sửa':'Thêm mới'}]}/>
    <div className="mx-auto max-w-2xl">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
        <InputField label="Tên rạp" id="name" value={form.name} onChange={handleChange('name')} required/>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField label="Khu vực" id="location" value={form.location} onChange={handleChange('location')} required/>
          <InputField label="Số phòng" id="rooms" type="number" value={form.totalRooms} onChange={handleChange('totalRooms')}/>
        </div>
        <InputField label="Địa chỉ" id="address" value={form.address} onChange={handleChange('address')} required/>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField label="Số điện thoại" id="phone" value={form.phone} onChange={handleChange('phone')}/>
          <InputField label="Email" id="email" type="email" value={form.email} onChange={handleChange('email')}/>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={()=>navigate('/admin/theaters')}>Huỷ</Button>
          <Button type="submit" disabled={loading}>{loading?'Đang lưu...':isEdit?'Cập nhật':'Thêm rạp'}</Button>
        </div>
      </form>
    </div>
  </>);
};
export default TheaterForm;

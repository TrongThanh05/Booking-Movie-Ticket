import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';
import InputField from '../../components/ui/input/InputField';

const ShowForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  return (<>
    <PageMeta title={`${isEdit?'Sửa':'Thêm'} Suất Chiếu | CineAdmin`}/>
    <PageBreadCrumb pageTitle={isEdit?'Sửa suất chiếu':'Thêm suất chiếu'} items={[{label:'Lịch Chiếu',path:'/admin/shows'},{label:isEdit?'Sửa':'Thêm mới'}]}/>
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
        <InputField label="Phim" id="movie" placeholder="Chọn phim..." />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField label="Rạp" id="cinema" placeholder="Chọn rạp..." />
          <InputField label="Phòng chiếu" id="room" placeholder="Chọn phòng..." />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField label="Ngày giờ chiếu" id="datetime" type="datetime-local" />
          <InputField label="Giá vé gốc (VND)" id="price" type="number" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField label="Định dạng" id="format" placeholder="2D / 3D / IMAX" />
          <InputField label="Ngôn ngữ" id="language" placeholder="Phụ đề Việt" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={()=>navigate('/admin/shows')}>Huỷ</Button>
          <Button>{isEdit?'Cập nhật':'Tạo suất chiếu'}</Button>
        </div>
      </div>
    </div>
  </>);
};
export default ShowForm;

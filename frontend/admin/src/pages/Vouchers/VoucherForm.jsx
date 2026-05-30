import { useParams, useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';
import InputField from '../../components/ui/input/InputField';

const VoucherForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  return (<>
    <PageMeta title={`${isEdit?'Sửa':'Thêm'} Khuyến mãi | CineAdmin`}/>
    <PageBreadCrumb pageTitle={isEdit?'Sửa mã khuyến mãi':'Thêm mã mới'} items={[{label:'Khuyến mãi',path:'/admin/vouchers'},{label:isEdit?'Sửa':'Thêm mới'}]}/>
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField label="Mã khuyến mãi" id="code" placeholder="VD: SUMMER2025" />
          <InputField label="Giảm giá (% hoặc VND)" id="discount" type="number" />
        </div>
        <InputField label="Mô tả" id="desc" placeholder="Mô tả khuyến mãi..." />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField label="Ngày hết hạn" id="expires" type="date" />
          <InputField label="Giới hạn sử dụng" id="limit" type="number" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={()=>navigate('/admin/vouchers')}>Huỷ</Button>
          <Button>{isEdit?'Cập nhật':'Tạo mã'}</Button>
        </div>
      </div>
    </div>
  </>);
};
export default VoucherForm;

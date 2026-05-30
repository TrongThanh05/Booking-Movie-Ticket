/**
 * MovieForm.jsx — Form thêm/sửa phim
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';
import InputField from '../../components/ui/input/InputField';
import { api } from '../../lib/api';

const MovieForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', overview: '', poster_path: '', backdrop_path: '',
    release_date: '', runtime: '', vote_average: '', original_language: 'vi',
    trailer_url: '', tagline: '',
  });

  useEffect(() => {
    if (isEdit) {
      api.get(`/movies/${id}`).then(r => {
        const m = r.data;
        setForm({
          title: m.title || '', overview: m.overview || '', poster_path: m.poster_path || '',
          backdrop_path: m.backdrop_path || '', release_date: m.release_date?.split('T')[0] || '',
          runtime: m.runtime || '', vote_average: m.vote_average || '', original_language: m.original_language || 'vi',
          trailer_url: m.trailer_url || '', tagline: m.tagline || '',
        });
      }).catch(console.error);
    }
  }, [id, isEdit]);

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) await api.put(`/movies/${id}`, form);
      else await api.post('/movies', form);
      navigate('/admin/movies');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <>
      <PageMeta title={`${isEdit ? 'Sửa' : 'Thêm'} Phim | CineAdmin`} />
      <PageBreadCrumb pageTitle={isEdit ? 'Sửa phim' : 'Thêm phim mới'}
        items={[{ label: 'Phim', path: '/admin/movies' }, { label: isEdit ? 'Sửa' : 'Thêm mới' }]} />

      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <InputField label="Tên phim" id="title" value={form.title} onChange={handleChange('title')} required className="md:col-span-2"/>
            <InputField label="Tagline" id="tagline" value={form.tagline} onChange={handleChange('tagline')} />
            <InputField label="Ngôn ngữ" id="lang" value={form.original_language} onChange={handleChange('original_language')} />
            <InputField label="Thời lượng (phút)" id="runtime" type="number" value={form.runtime} onChange={handleChange('runtime')} />
            <InputField label="Đánh giá" id="rating" type="number" value={form.vote_average} onChange={handleChange('vote_average')} />
            <InputField label="Ngày chiếu" id="release" type="date" value={form.release_date} onChange={handleChange('release_date')} />
            <InputField label="Trailer URL" id="trailer" value={form.trailer_url} onChange={handleChange('trailer_url')} />
            <InputField label="Poster URL" id="poster" value={form.poster_path} onChange={handleChange('poster_path')} className="md:col-span-2"/>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Mô tả</label>
            <textarea rows={4} value={form.overview} onChange={handleChange('overview')}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:bg-gray-900 dark:border-gray-700 dark:text-white/90"/>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => navigate('/admin/movies')}>Huỷ</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm phim'}</Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default MovieForm;

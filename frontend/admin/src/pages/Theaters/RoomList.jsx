import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Table from '../../components/ui/table/Table';
import { api } from '../../lib/api';

const RoomList = () => {
  const { theaterId } = useParams();
  const [rooms, setRooms] = useState([]);
  const [theater, setTheater] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/rooms?theater_id=${theaterId}`).then(r => setRooms(r.data?.rooms || r.data || [])).catch(() => setRooms([
        { _id:'1', name:'Phòng 1', screen_type:'2D', capacity:120, status:'active' },
        { _id:'2', name:'Phòng IMAX', screen_type:'IMAX', capacity:200, status:'active' },
        { _id:'3', name:'Phòng 3', screen_type:'3D', capacity:80, status:'maintenance' },
      ])),
      api.get(`/theaters/${theaterId}`).then(r => setTheater(r.data)).catch(() => setTheater({ name: 'Rạp' })),
    ]).finally(() => setLoading(false));
  }, [theaterId]);

  const statusMap = { active:{label:'Hoạt động',color:'success'}, maintenance:{label:'Bảo trì',color:'warning'}, inactive:{label:'Ngừng',color:'error'} };

  return (<>
    <PageMeta title={`Phòng chiếu | CineAdmin`}/>
    <PageBreadCrumb pageTitle={`Phòng chiếu — ${theater?.name||''}`} items={[{label:'Cụm Rạp',path:'/admin/theaters'},{label:'Phòng chiếu'}]}/>
    {loading ? <div className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"/> : (
      <Table>
        <Table.Head><tr><Table.Header>Tên phòng</Table.Header><Table.Header>Loại màn hình</Table.Header><Table.Header>Sức chứa</Table.Header><Table.Header>Trạng thái</Table.Header></tr></Table.Head>
        <Table.Body>
          {rooms.map(r => (
            <Table.Row key={r._id}>
              <Table.Cell><p className="font-semibold text-gray-800 dark:text-white/90">{r.name}</p></Table.Cell>
              <Table.Cell><Badge variant="light" color="info" size="sm">{r.screen_type}</Badge></Table.Cell>
              <Table.Cell>{r.capacity} ghế</Table.Cell>
              <Table.Cell><Badge variant="light" color={statusMap[r.status]?.color||'light'} size="sm">{statusMap[r.status]?.label||r.status}</Badge></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    )}
  </>);
};
export default RoomList;

import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { userApi } from "../../lib/userApi";
import api from "../../lib/api";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: backend doesn't have a GET /users list endpoint yet
    // This will work once added, for now use a placeholder
    api.get("/users")
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageMeta title="Khách hàng | Admin" description="Danh sách khách hàng" />
      <PageBreadCrumb pageTitle="Danh sách Khách hàng" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Khách hàng ({users.length})</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Đang tải...</span></div>
          ) : users.length === 0 ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Chưa có dữ liệu</span></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Tên</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">SĐT</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Vai trò</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{u.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.phone || "—"}</td>
                    <td className="px-6 py-4">
                      <Badge variant="light" color={u.role === "admin" ? "error" : "primary"}>
                        {u.role}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

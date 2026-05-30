/**
 * Table.jsx — Responsive data table wrapper
 */
const Table = ({ children, className = '' }) => (
  <div className={`overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 ${className}`}>
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
      {children}
    </table>
  </div>
);

const TableHead = ({ children }) => (
  <thead className="bg-gray-50 dark:bg-gray-800/50">{children}</thead>
);

const TableBody = ({ children }) => (
  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
    {children}
  </tbody>
);

const TableRow = ({ children, className = '', onClick }) => (
  <tr onClick={onClick} className={`transition-colors hover:bg-gray-50 dark:hover:bg-white/[.02] ${className}`}>
    {children}
  </tr>
);

const TableHeader = ({ children, className = '' }) => (
  <th className={`px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 ${className}`}>
    {children}
  </th>
);

const TableCell = ({ children, className = '' }) => (
  <td className={`px-5 py-4 text-sm text-gray-700 dark:text-gray-300 ${className}`}>
    {children}
  </td>
);

Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Header = TableHeader;
Table.Cell = TableCell;

export default Table;

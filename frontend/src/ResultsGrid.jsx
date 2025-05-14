
import { Paper } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

export default function ResultsGrid({ rows }) {
  const columns = [
    { field: 'emp1', headerName: 'Employee #1', flex: 1 },
    { field: 'emp2', headerName: 'Employee #2', flex: 1 },
    { field: 'project', headerName: 'Project ID', flex: 1 },
    { field: 'days', headerName: 'Days Worked', flex: 1, type: 'number' },
  ];

  return (
    <Paper sx={{
        minWidth: '500px',
        margin: '0 auto'}}>
      <DataGrid
      sx={{minWidth: '500'}}
        columns={columns}
        rows={rows}
        pageSizeOptions={[5, 10, 25]}
        disableRowSelectionOnClick
        initialState={{
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
        density="comfortable"
      />
    </Paper>
  );
}
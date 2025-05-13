import { Paper } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

export default function ResultsGrid({ rows }) { 
  const cols = [
    { field: 'emp1', headerName: 'Employee #1', flex: 1 },
    { field: 'emp2', headerName: 'Employee #2', flex: 1 },
    { field: 'project', headerName: 'Project ID', flex: 1 },
    { field: 'days', headerName: 'Days', flex: 1, type: 'number' }
  ];

  if (!rows?.length) return null;

  return (
    <Paper>
      <DataGrid
        columns={cols}
        rows={rows}
        pageSizeOptions={[5, 10, 25]}
        disableRowSelectionOnClick
      />
    </Paper>
  );
}
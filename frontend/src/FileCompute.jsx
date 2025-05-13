import { useState } from 'react';
import axios from 'axios';
import { Container, Typography, Paper, Button, Alert } from '@mui/material';
import ResultsGrid from './ResultsGrid';

function FileCompute() {
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [top, setTop] = useState(null);
    const [error, setError] = useState('');

    const upload = async () => {
        setError('');
        if (!file) return;
        const form = new FormData();
        form.append('file', file);
        try {
            const { data } = await axios.post('http://localhost:4000/api/upload', form);
            setRows(data.rows.map((r, id) => ({
                id, emp1: r.empA, emp2: r.empB, project: r.proj, days: r.days
            })));
            setTop(data.top);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        }
    };

    return (
        <>
            <Container sx={{ py: 5, backgroundColor: 'white' }}>
                <Typography variant="h4" gutterBottom>
                    Longest-Working Employee Pair
                </Typography>

                <Paper sx={{ p: 3, mb: 4 }}>
                    <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} />
                    <Button variant="contained" sx={{ ml: 2 }} disabled={!file} onClick={upload}>
                        Process
                    </Button>
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                </Paper>

                {top && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                        Longest-working pair: <strong>{top.empA}</strong> &amp; <strong>{top.empB}</strong> → <strong>{top.totalDays}</strong> days
                    </Alert>
                )}


            <ResultsGrid rows={rows} />
            </Container>
        </>
    );
}

export default FileCompute;
import { useState } from 'react';
import axios from 'axios';
import { Container, Typography, Paper, Button, Alert, Box } from '@mui/material';
import ResultsGrid from './ResultsGrid';

function FileCompute() {
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [top, setTop] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [processed, setProcessed] = useState(false);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };

    const upload = async () => {
        if (!file) return;

        setRows([]);
        setTop(null);
        setError('');
        setProcessed(false);
        setLoading(true);

        console.log("Starting file upload...");

        try {
            const form = new FormData();
            form.append('file', file);

            console.log("Sending file to the server:", file.name);

            const { data } = await axios.post('http://localhost:4000/api/upload', form);

            console.log("Received response from server:", data);

            // Check for errors in the server response
            if (data.errors && data.errors.length > 0) {
                console.log("Server errors:", data.errors);
                const errorMessages = data.errors.map((error, index) => 
                    `Error in record [${error.record}]: ${error.message}`
                ).join('\n');
                setError(errorMessages); // Update error state
                return; // Early return to stop further processing
            }

            // Process successful response
            setRows(data.pairs.flatMap((pair, id) => 
                pair.projects.map((proj, projId) => ({
                    id: `${id}-${projId}`,
                    emp1: pair.empA,
                    emp2: pair.empB,
                    project: proj.proj,
                    days: proj.days
                }))
            ));
            setTop(data.top);

        } catch (e) {
            // Check if error has response data
            if (e.response) {
                const errorMessage = e.response?.data?.error || e.message || 'An unknown error occurred';
                setError(errorMessage);
            } else {
                setError('An unknown error occurred');
            }
        } finally {
            console.log("File upload process complete");
            setLoading(false);
            setProcessed(true);
        }
    };

    return (
        <Container
            maxWidth={false}
            disableGutters
            sx={{
                width: '100vw',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                pt: 5,
            }}
        >
            <Paper
                sx={{
                    p: 3,
                    mb: 3,
                    flexShrink: 0,
                    flexGrow: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: dragActive ? '#e3f2fd' : '#f9f9f9',
                    border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
                    textAlign: 'center',
                }}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <Typography variant="h4" gutterBottom>
                    Longest-Working Employee Pair
                </Typography>
                <input
                    type="file"
                    accept=".csv"
                    onChange={e => setFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="fileInput"
                />
                <label htmlFor="fileInput">
                    <Button variant="contained" component="span" disabled={loading}>
                        Select CSV File
                    </Button>
                </label>
                <Typography variant="caption" sx={{ mt: 1 }}>
                    Or drag and drop your CSV file here
                </Typography>

                {file && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Selected: {file.name}
                    </Typography>
                )}

                <Button
                    variant="outlined"
                    sx={{ mt: 2 }}
                    disabled={!file || loading}
                    onClick={upload}
                >
                    {loading ? 'Processing...' : 'Process File'}
                </Button>
            </Paper>

            {!loading && error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {!loading && !error && top && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    Employee with Id #{top.empA} and Employee with Id #{top.empB} worked together on a common project for {top.totalDays} days
                </Alert>
            )}

            {!loading && !error && processed && file && (
                <Box>
                    {rows.length > 0 ? (
                        <ResultsGrid rows={rows} />
                    ) : (
                        <Alert severity="info">
                            No overlap between any employees in this file.
                        </Alert>
                    )}
                </Box>
            )}

        </Container>
    );
}

export default FileCompute;

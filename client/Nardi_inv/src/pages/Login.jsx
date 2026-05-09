import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Alert } from '@mantine/core';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <Container size={420} my={80}>
      <Title align="center" sx={(theme) => ({ fontFamily: `Greycliff CF, ${theme.fontFamily}`, fontWeight: 900 })}>
        NARDI Inventory
      </Title>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextInput label="Email" placeholder="you@nardi.local" value={email} onChange={(e) => setEmail(e.currentTarget.value)} required />
          <PasswordInput label="Password" placeholder="Your password" mt="md" value={password} onChange={(e) => setPassword(e.currentTarget.value)} required />
          <Button fullWidth mt="xl" type="submit">Sign in</Button>
        </form>
      </Paper>
    </Container>
  );
}
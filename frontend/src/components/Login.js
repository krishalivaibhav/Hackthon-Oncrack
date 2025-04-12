import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
`;

const LoginForm = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
`;

const Title = styled.h2`
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s ease;
  margin-bottom: 1rem;
  
  &:hover {
    background: #357abd;
  }
`;

const OAuthButton = styled(Button)`
  background: #fff;
  color: #333;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  
  &:hover {
    background: #f5f5f5;
  }
  
  img {
    width: 20px;
    height: 20px;
  }
`;

const ErrorMessage = styled.div`
  color: #ff3b30;
  margin-top: 1rem;
  text-align: center;
`;

const RegisterLink = styled.div`
  text-align: center;
  margin-top: 1rem;
  color: #666;
  
  a {
    color: #4a90e2;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1rem 0;
  color: #666;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #ddd;
  }
  
  span {
    padding: 0 1rem;
  }
`;

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting login with:', { email, password });
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        email,
        password
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });

      console.log('Login response:', response.data);

      if (response.data.token) {
        console.log('Storing token and navigating...');
        localStorage.setItem('token', response.data.token);
        window.location.href = '/';
      } else {
        console.log('No token received');
        setError('Login failed - no token received');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        setError(err.response.data.error || 'Login failed');
      } else if (err.request) {
        console.error('No response received:', err.request);
        setError('Could not connect to server. Please try again.');
      } else {
        console.error('Error:', err.message);
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5001/api/auth/google';
  };

  return (
    <LoginContainer>
      <LoginForm>
        <Title>Login</Title>
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormGroup>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        
        <Divider>
          <span>or</span>
        </Divider>
        
        <OAuthButton type="button" onClick={handleGoogleLogin}>
          <img src="https://www.google.com/favicon.ico" alt="Google" />
          Continue with Google
        </OAuthButton>
        
        <RegisterLink>
          Don't have an account? <Link to="/register">Register</Link>
        </RegisterLink>
      </LoginForm>
    </LoginContainer>
  );
}

export default Login; 
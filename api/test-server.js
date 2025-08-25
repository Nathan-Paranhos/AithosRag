import AuthService from './microservices/auth/authService.js';

console.log('🔧 Testing AuthService initialization...');

try {
  const authService = new AuthService({
    port: 3001,
    jwtSecret: 'test-secret',
    environment: 'development'
  });
  
  console.log('✅ AuthService created successfully');
  
  await authService.start();
  console.log('✅ AuthService started successfully');
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
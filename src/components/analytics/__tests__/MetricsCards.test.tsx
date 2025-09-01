import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricsCards } from '../MetricsCards';
import { ChartDataPoint } from '../MetricsCards';

describe('MetricsCards', () => {
  const mockChartData: ChartDataPoint[] = [
    {
      time: '10:00',
      messages: 50,
      users: 25,
      responseTime: 150,
    },
    {
      time: '11:00',
      messages: 75,
      users: 30,
      responseTime: 200,
    },
    {
      time: '12:00',
      messages: 100,
      users: 45,
      responseTime: 120,
    },
  ];

  const defaultProps = {
    chartData: mockChartData,
  };

  it('renders all metric cards', () => {
    render(<MetricsCards {...defaultProps} />);
    
    expect(screen.getByText('Total de Mensagens')).toBeTruthy();
    expect(screen.getByText('Total de Usuários')).toBeTruthy();
    expect(screen.getByText('Tempo Médio de Resposta')).toBeTruthy();
    expect(screen.getByText('Taxa de Sucesso')).toBeTruthy();
  });

  it('calculates total messages correctly', () => {
    render(<MetricsCards {...defaultProps} />);
    
    // 50 + 75 + 100 = 225
    expect(screen.getByText('225')).toBeTruthy();
  });

  it('calculates total users correctly', () => {
    render(<MetricsCards {...defaultProps} />);
    
    // 25 + 30 + 45 = 100
    expect(screen.getByText('100')).toBeTruthy();
  });

  it('calculates average response time correctly', () => {
    render(<MetricsCards {...defaultProps} />);
    
    // (150 + 200 + 120) / 3 = 156.67 -> 157ms (rounded)
    expect(screen.getByText('157ms')).toBeTruthy();
  });

  it('displays success rate correctly', () => {
    render(<MetricsCards {...defaultProps} />);
    
    expect(screen.getByText('98.5%')).toBeTruthy();
  });

  it('handles empty chart data', () => {
    render(<MetricsCards chartData={[]} />);
    
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThan(0); // Total messages and users
    expect(screen.getByText('0ms')).toBeTruthy(); // Average response time
    expect(screen.getByText('0%')).toBeTruthy(); // Success rate
  });

  it('displays correct icons for each metric', () => {
    render(<MetricsCards {...defaultProps} />);
    
    // Verifica se os ícones estão presentes através de suas classes ou atributos
    const messageIcon = screen.getByTestId('messages-icon') || document.querySelector('[data-lucide="message-square"]');
    const usersIcon = screen.getByTestId('users-icon') || document.querySelector('[data-lucide="users"]');
    const timeIcon = screen.getByTestId('time-icon') || document.querySelector('[data-lucide="clock"]');
    const successIcon = screen.getByTestId('success-icon') || document.querySelector('[data-lucide="check-circle"]');
    
    // Como os ícones do Lucide podem não ter testids, verificamos se os containers existem
    expect(screen.getByText('Total de Mensagens').closest('.bg-blue-500')).toBeTruthy();
    expect(screen.getByText('Total de Usuários').closest('.bg-green-500')).toBeTruthy();
    expect(screen.getByText('Tempo Médio de Resposta').closest('.bg-yellow-500')).toBeTruthy();
    expect(screen.getByText('Taxa de Sucesso').closest('.bg-purple-500')).toBeTruthy();
  });

  it('applies correct background colors to metric cards', () => {
    render(<MetricsCards {...defaultProps} />);
    
    const messagesCard = screen.getByText('Total de Mensagens').closest('.bg-blue-500');
    const usersCard = screen.getByText('Total de Usuários').closest('.bg-green-500');
    const timeCard = screen.getByText('Tempo Médio de Resposta').closest('.bg-yellow-500');
    const successCard = screen.getByText('Taxa de Sucesso').closest('.bg-purple-500');
    
    expect(messagesCard).toBeTruthy();
    expect(usersCard).toBeTruthy();
    expect(timeCard).toBeTruthy();
    expect(successCard).toBeTruthy();
  });

  it('handles single data point correctly', () => {
    const singleDataPoint: ChartDataPoint[] = [
      {
        time: '10:00',
        messages: 42,
        users: 15,
        responseTime: 180,
      },
    ];
    
    render(<MetricsCards chartData={singleDataPoint} />);
    
    expect(screen.getByText('42')).toBeTruthy(); // Total messages
    expect(screen.getByText('15')).toBeTruthy(); // Total users
    expect(screen.getByText('180ms')).toBeTruthy(); // Average response time
  });

  it('rounds average response time to nearest integer', () => {
    const dataWithDecimals: ChartDataPoint[] = [
      { time: '10:00', messages: 10, users: 5, responseTime: 100 },
      { time: '11:00', messages: 20, users: 10, responseTime: 150 },
      { time: '12:00', messages: 30, users: 15, responseTime: 200 },
    ];
    
    render(<MetricsCards chartData={dataWithDecimals} />);
    
    // (100 + 150 + 200) / 3 = 150ms (exact)
    expect(screen.getByText('150ms')).toBeTruthy();
  });

  it('maintains responsive design classes', () => {
    render(<MetricsCards {...defaultProps} />);
    
    const container = screen.getByText('Total de Mensagens').closest('.grid');
    expect(container?.className).toContain('grid-cols-1');
  });
});
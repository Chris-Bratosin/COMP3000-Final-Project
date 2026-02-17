import { render, screen } from '@testing-library/react';
import { ActivityLog } from './ActivityLog';

describe('ActivityLog', () => {
  it('renders the section heading', () => {
    render(<ActivityLog />);

    expect(screen.getByRole('heading', { name: /activity log/i })).toBeInTheDocument();
  });

  it('renders all expected log entries', () => {
    render(<ActivityLog />);

    expect(screen.getByText('12:58 PM')).toBeInTheDocument();
    expect(screen.getByText('Scan started')).toBeInTheDocument();

    expect(screen.getByText('12:59 PM')).toBeInTheDocument();
    expect(screen.getByText('S3 bucket "my-bucket" found to be public.')).toBeInTheDocument();

    expect(screen.getByText('1:02 PM')).toBeInTheDocument();
    expect(
      screen.getByText('AdminRole policy detected with excessive permissions.'),
    ).toBeInTheDocument();
  });
});

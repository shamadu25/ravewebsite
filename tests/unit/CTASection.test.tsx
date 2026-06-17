import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CTASection from '@/components/ui/CTASection';

describe('CTASection', () => {
  it('renders the CTA link', () => {
    render(<CTASection />);
    expect(screen.getByRole('link', { name: /book a free consultation/i })).toBeInTheDocument();
  });
});

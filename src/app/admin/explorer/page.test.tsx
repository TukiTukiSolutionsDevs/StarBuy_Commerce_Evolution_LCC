import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExplorerPage from './page';
import { CATEGORY_TREE } from '@/lib/trends/categories';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ExplorerPage — Category Browser', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the Market Explorer heading', () => {
    render(<ExplorerPage />);
    expect(screen.getByRole('heading', { name: /market explorer/i })).toBeInTheDocument();
  });

  it('renders all 8 category cards', () => {
    render(<ExplorerPage />);
    expect(CATEGORY_TREE).toHaveLength(8);
    for (const cat of CATEGORY_TREE) {
      expect(screen.getByText(cat.label)).toBeInTheDocument();
    }
  });

  it('shows 8 data-testid="category-card" elements', () => {
    render(<ExplorerPage />);
    expect(screen.getAllByTestId('category-card')).toHaveLength(8);
  });

  it('shows subcategory count on each card', () => {
    render(<ExplorerPage />);
    // Electronics has 4 subcategories
    const card = screen.getByText('Electronics & Tech').closest('[data-testid="category-card"]');
    expect(card).toHaveTextContent('4');
  });

  it('clicking a card navigates to the category detail page', () => {
    render(<ExplorerPage />);
    fireEvent.click(screen.getByText(CATEGORY_TREE[0].label));
    expect(mockPush).toHaveBeenCalledWith(`/admin/explorer/${CATEGORY_TREE[0].id}`);
  });

  it('renders the filter input with placeholder', () => {
    render(<ExplorerPage />);
    expect(screen.getByPlaceholderText(/filter categories/i)).toBeInTheDocument();
  });

  it('filters categories by search text', () => {
    render(<ExplorerPage />);
    const input = screen.getByPlaceholderText(/filter categories/i);
    fireEvent.change(input, { target: { value: 'Beauty' } });
    expect(screen.getByText('Beauty & Personal Care')).toBeInTheDocument();
    expect(screen.queryByText('Pets')).not.toBeInTheDocument();
  });

  it('shows all 8 cards when search is cleared', () => {
    render(<ExplorerPage />);
    const input = screen.getByPlaceholderText(/filter categories/i);
    fireEvent.change(input, { target: { value: 'Beauty' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getAllByTestId('category-card')).toHaveLength(8);
  });

  it('renders the Explore All button', () => {
    render(<ExplorerPage />);
    expect(screen.getByRole('button', { name: /explore all/i })).toBeInTheDocument();
  });

  it('Explore All navigates to trends with all keywords', () => {
    render(<ExplorerPage />);
    fireEvent.click(screen.getByRole('button', { name: /explore all/i }));
    expect(mockPush).toHaveBeenCalledWith('/admin/trends?keywords=all&autorun=true');
  });
});

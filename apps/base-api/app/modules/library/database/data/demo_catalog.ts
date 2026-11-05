/**
 * Extra demo catalog & patrons for local/staging testing
 * (reservations search dropdowns, circulation, etc.)
 */
export const DEMO_BOOKS = [
  {
    title: '1984',
    authorNames: 'George Orwell',
    isbn13: '9780451524935',
    description: 'A dystopian social science fiction novel.',
    copies: 2,
  },
  {
    title: 'The Great Gatsby',
    authorNames: 'F. Scott Fitzgerald',
    isbn13: '9780743273565',
    description: 'A portrait of the Jazz Age in all of its decadence and excess.',
    copies: 1,
  },
  {
    title: 'To Kill a Mockingbird',
    authorNames: 'Harper Lee',
    isbn13: '9780061120084',
    description: 'A gripping tale of racial injustice and childhood innocence.',
    copies: 1,
  },
  {
    title: 'Pride and Prejudice',
    authorNames: 'Jane Austen',
    isbn13: '9780141439518',
    description: 'A classic novel of manners, marriage, and misunderstanding.',
    copies: 2,
  },
  {
    title: 'The Hobbit',
    authorNames: 'J.R.R. Tolkien',
    isbn13: '9780547928227',
    description: 'Bilbo Baggins embarks on an unexpected adventure.',
    copies: 2,
  },
  {
    title: 'Clean Code',
    authorNames: 'Robert C. Martin',
    isbn13: '9780132350884',
    description: 'A handbook of agile software craftsmanship.',
    copies: 3,
  },
  {
    title: 'Introduction to Algorithms',
    authorNames: 'Thomas H. Cormen',
    isbn13: '9780262046305',
    description: 'Comprehensive textbook covering algorithms and data structures.',
    copies: 2,
  },
  {
    title: 'Sapiens: A Brief History of Humankind',
    authorNames: 'Yuval Noah Harari',
    isbn13: '9780062316097',
    description: 'A sweeping narrative of human history from early foragers to today.',
    copies: 1,
  },
] as const

export const DEMO_MEMBERS = [
  {
    fullName: 'Jane Student',
    email: 'jane.student@demo.library',
    contact: '+15550101001',
    department: 'Computer Science',
    memberType: 'student' as const,
    membershipStatus: 'approved' as const,
  },
  {
    fullName: 'Dr. Alan Faculty',
    email: 'alan.faculty@demo.library',
    contact: '+15550101002',
    department: 'English Literature',
    memberType: 'faculty' as const,
    membershipStatus: 'approved' as const,
  },
  {
    fullName: 'Maria Santos',
    email: 'maria.santos@demo.library',
    contact: '+15550101003',
    department: 'Business Administration',
    memberType: 'student' as const,
    membershipStatus: 'approved' as const,
  },
  {
    fullName: 'John Researcher',
    email: 'john.researcher@demo.library',
    contact: '+15550101004',
    department: 'Library Science',
    memberType: 'researcher' as const,
    membershipStatus: 'approved' as const,
  },
  {
    fullName: 'Elena Employee',
    email: 'elena.employee@demo.library',
    contact: '+15550101005',
    department: 'Registrar',
    memberType: 'employee' as const,
    membershipStatus: 'approved' as const,
  },
  {
    fullName: 'Pending Applicant',
    email: 'pending@demo.library',
    contact: '+15550101006',
    department: null,
    memberType: 'guest' as const,
    membershipStatus: 'pending' as const,
  },
] as const

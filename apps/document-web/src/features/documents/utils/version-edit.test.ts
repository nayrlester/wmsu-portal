import { describe, expect, it } from 'vitest'
import {
  canManageDocumentDrafts,
  canModifyVersionFile,
  isEditableVersionStatus,
  shouldShowFileUploadZone,
} from './version-edit'

describe('version-edit gates', () => {
  it('treats returned as editable and branchable', () => {
    expect(isEditableVersionStatus('returned')).toBe(true)
    expect(canModifyVersionFile('returned', true)).toBe(true)
    expect(canModifyVersionFile('returned', false)).toBe(false)
  })

  it('locks pending_approval content changes', () => {
    expect(isEditableVersionStatus('pending_approval')).toBe(false)
    expect(canModifyVersionFile('pending_approval', true)).toBe(false)
  })

  it('allows draft management from update permission without ownership', () => {
    expect(canManageDocumentDrafts(true, false)).toBe(true)
    expect(canManageDocumentDrafts(false, true)).toBe(true)
    expect(canManageDocumentDrafts(false, false)).toBe(false)
  })

  it('shows upload zone for returned version that already has files', () => {
    expect(
      shouldShowFileUploadZone(true, [
        { status: 'returned', files: [{ id: 'f1' }] },
      ])
    ).toBe(true)
  })

  it('shows upload zone for rejected versions (branch to new draft)', () => {
    expect(
      shouldShowFileUploadZone(true, [
        { status: 'rejected', files: [{ id: 'f1' }] },
      ])
    ).toBe(true)
  })

  it('hides upload zone when drafts are not manageable', () => {
    expect(
      shouldShowFileUploadZone(false, [
        { status: 'returned', files: [{ id: 'f1' }] },
      ])
    ).toBe(false)
  })

  it('hides upload zone for pending_approval-only versions', () => {
    expect(
      shouldShowFileUploadZone(true, [
        { status: 'pending_approval', files: [{ id: 'f1' }] },
      ])
    ).toBe(false)
  })
})

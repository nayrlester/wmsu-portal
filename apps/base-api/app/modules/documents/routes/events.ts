import emitter from '@adonisjs/core/services/emitter'
import AuditDocumentActionListener from '#modules/documents/listeners/audit_document_action_listener'
import LogDocumentActionListener from '#modules/documents/listeners/log_document_action_listener'
import NotificationDocumentActionListener from '#modules/documents/listeners/notification_document_action_listener'

const auditListener = new AuditDocumentActionListener()
const logListener = new LogDocumentActionListener()
const notificationListener = new NotificationDocumentActionListener()

emitter.on('document:action', (payload) => auditListener.handle(payload))
emitter.on('document:action', (payload) => logListener.handle(payload))
emitter.on('document:action', (payload) => notificationListener.handle(payload))

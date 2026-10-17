# Bhumi Container Service — RBAC Alignment

The supplied backend already contains route-level `authMiddleware` and `roleMiddleware` protection. The frontend RBAC work aligns the UI with those backend roles while keeping the backend as the final security authority.

Roles:
- super_admin
- admin
- manager
- accountant
- driver
- vendor

No backend authorization bypass has been introduced. Unauthorized API access remains a backend 403.

The supplied backend currently has no dedicated driver/vendor self-service operational endpoints, so the frontend intentionally does not expose admin/operational screens to those roles.

import { useState, MouseEvent } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, AppBar, Toolbar, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Typography, Avatar,
  Tooltip, Divider, Badge, Menu, MenuItem,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  QuestionAnswer as EnquiryIcon,
  RequestQuote as QuoteIcon,
  CalendarMonth as SchedulerIcon,
  Work as JobIcon,
  People as CustomerIcon,
  Engineering as InstallerIcon,
  Menu as MenuIcon,
  BoltOutlined as BoltIcon,
  Notifications as NotifIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { useAuth0 } from '@auth0/auth0-react'
import { sbgColors } from '../theme'
import { authConfigured } from '../auth/config'
import { useCurrentUser } from '../auth/useCurrentUser'

const DRAWER_WIDTH = 240
const COLLAPSED_WIDTH = 72

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Enquiries', icon: <EnquiryIcon />, path: '/enquiries' },
  { label: 'Quotes', icon: <QuoteIcon />, path: '/quotes' },
  { label: 'Scheduler', icon: <SchedulerIcon />, path: '/scheduler' },
  { label: 'Jobs', icon: <JobIcon />, path: '/jobs' },
  { label: 'Customers', icon: <CustomerIcon />, path: '/customers' },
  { label: 'Installers', icon: <InstallerIcon />, path: '/installers' },
]

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth0()
  const currentUser = useCurrentUser()

  const drawerWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH

  const handleAvatarClick = (e: MouseEvent<HTMLElement>) => {
    if (authConfigured) setMenuAnchor(e.currentTarget)
  }
  const handleLogout = () => {
    setMenuAnchor(null)
    logout({ logoutParams: { returnTo: window.location.origin } })
  }

  const renderDrawer = (isCollapsed: boolean, canToggle: boolean) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Tooltip title={canToggle ? (isCollapsed ? 'Expand' : 'Collapse') : ''}>
        <Box
          onClick={canToggle ? () => setCollapsed(c => !c) : undefined}
          sx={{
            p: 2, display: {xs: 'none', sm: 'flex'}, alignItems: 'center', gap: 1,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            background: `linear-gradient(135deg, ${sbgColors.blue} 0%, #0000cc 100%)`,
            minHeight: 64,
            cursor: canToggle ? 'pointer' : 'default',
          }}
        >
          <BoltIcon sx={{ color: sbgColors.yellow, fontSize: 32 }} />
          {!isCollapsed && (
            <Box>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.1 }}>
                Solar Battery
              </Typography>
              <Typography variant="caption" sx={{ color: sbgColors.yellow, fontWeight: 700, letterSpacing: 1 }}>
                GROUP — SCHEDULER
              </Typography>
            </Box>
          )}
        </Box>
      </Tooltip>

      <Divider />

      {/* Nav items */}
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {navItems.map(({ label, icon, path }) => {
          const selected = location.pathname.startsWith(path)
          return (
            <ListItem key={path} disablePadding>
              <Tooltip title={isCollapsed ? label : ''} placement="right" arrow>
                <ListItemButton
                  selected={selected}
                  onClick={() => navigate(path)}
                  sx={{
                    mx: 1, borderRadius: 2, mb: 0.5,
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    px: isCollapsed ? 1.5 : 2,
                    '&.Mui-selected': {
                      backgroundColor: `${sbgColors.blue}18`,
                      color: sbgColors.blue,
                      '& .MuiListItemIcon-root': { color: sbgColors.blue },
                      '&:hover': { backgroundColor: `${sbgColors.blue}28` },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40, mr: isCollapsed ? 0 : 1, justifyContent: 'center' }}>
                    {icon}
                  </ListItemIcon>
                  {!isCollapsed && (
                    <ListItemText primary={label} primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }} />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )
        })}
      </List>

      <Divider />
      <Tooltip title={canToggle ? (isCollapsed ? 'Expand' : 'Collapse') : ''}>
        <Box
          onClick={canToggle ? () => setCollapsed(c => !c) : undefined}
          sx={{
            p: 2, display: 'flex', alignItems: 'center', gap: 1,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            cursor: canToggle ? 'pointer' : 'default',
          }}
        >
          <Avatar src={currentUser.picture} sx={{ width: 32, height: 32, bgcolor: sbgColors.blue, fontSize: 14 }}>
            {currentUser.initial}
          </Avatar>
          {!isCollapsed && (
            <Box>
              <Typography variant="body2" fontWeight={600}>{currentUser.name}</Typography>
              <Typography variant="caption" color="text.secondary">{currentUser.subtitle}</Typography>
            </Box>
          )}
        </Box>
      </Tooltip>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile AppBar */}
      <AppBar position="fixed" sx={{ display: { sm: 'none' }, zIndex: 1300 }}>
        <Toolbar sx={{ minHeight: '54px !important' }}>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)}>
            <MenuIcon />
          </IconButton>
          <BoltIcon sx={{ color: sbgColors.yellow, mr: 1 }} />
          <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>SBG Scheduler</Typography>
          <Badge badgeContent={3} color="secondary">
            <NotifIcon />
          </Badge>
        </Toolbar>
      </AppBar>

      {/* Desktop sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          transition: theme => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
            overflowX: 'hidden',
            transition: theme => theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {renderDrawer(collapsed, true)}
      </Drawer>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {renderDrawer(false, false)}
      </Drawer>

      {/* Top bar (desktop) */}
      <Box
        component="header"
        sx={{
          display: { xs: 'none', sm: 'flex' },
          position: 'fixed',
          top: 0,
          left: drawerWidth,
          right: 0,
          height: 64,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          alignItems: 'center',
          px: 3,
          zIndex: 1200,
          gap: 2,
          transition: theme => theme.transitions.create('left', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, color: 'text.primary' }}>
          {navItems.find(n => location.pathname.startsWith(n.path))?.label ?? 'SBG Scheduler'}
        </Typography>
        {/* <Tooltip title="Notifications">
          <IconButton>
            <Badge badgeContent={3} color="secondary">
              <NotifIcon />
            </Badge>
          </IconButton>
        </Tooltip> */}
        <Tooltip title={authConfigured ? currentUser.name : ''}>
          <Avatar
            src={currentUser.picture}
            onClick={handleAvatarClick}
            sx={{ width: 36, height: 36, bgcolor: sbgColors.blue, cursor: authConfigured ? 'pointer' : 'default' }}
          >
            {currentUser.initial}
          </Avatar>
        </Tooltip>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            Log out
          </MenuItem>
        </Menu>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: 8,
          p: { xs: 2, sm: 3 },
          bgcolor: 'background.default',
          transition: theme => theme.transitions.create('margin-left', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}

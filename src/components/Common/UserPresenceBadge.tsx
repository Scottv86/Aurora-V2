import React from 'react';
import { Sparkles, User as UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TwinPresenceStatus } from '../../types/twin';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { useDigitalTwin } from '../../context/DigitalTwinContext';
import { useUserProfileCard } from '../../context/UserProfileCardContext';
import { useOptionalChat } from '../../context/ChatContext';

export const normalizePresenceStatus = (status?: string | null): TwinPresenceStatus => {
  if (!status) return 'AVAILABLE';
  const s = String(status).trim().toUpperCase();
  switch (s) {
    case 'AVAILABLE':
    case 'ONLINE':
    case 'ACTIVE':
    case 'CONNECTED':
    case 'VIEWING':
    case 'EDITING':
      return 'AVAILABLE';
    case 'AWAY':
    case 'AWAY_TWIN':
      return 'AWAY_TWIN';
    case 'BUSY':
    case 'DND':
    case 'DND_INTERCEPT':
      return 'DND_INTERCEPT';
    case 'NIGHT_SHIFT':
      return 'NIGHT_SHIFT';
    case 'OFFLINE':
    case 'INACTIVE':
    case 'SUSPENDED':
    case 'DISABLED':
      return 'OFFLINE';
    default:
      return 'AVAILABLE';
  }
};

interface UserPresenceBadgeProps {
  status?: TwinPresenceStatus | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export const UserPresenceBadge: React.FC<UserPresenceBadgeProps> = ({
  status = 'AVAILABLE',
  size = 'sm',
  className,
  showLabel = false
}) => {
  const normStatus = normalizePresenceStatus(status);

  const sizeClasses = {
    xs: 'w-2 h-2 text-[6px]',
    sm: 'w-2.5 h-2.5 text-[7px]',
    md: 'w-3 h-3 text-[8px]',
    lg: 'w-3.5 h-3.5 text-[9px]'
  };

  const statusColors = {
    AVAILABLE: 'bg-emerald-500',
    AWAY_TWIN: 'bg-amber-500 shadow-sm shadow-amber-500/50',
    DND_INTERCEPT: 'bg-red-500',
    NIGHT_SHIFT: 'bg-purple-600',
    OFFLINE: 'bg-zinc-400'
  };

  const labels = {
    AVAILABLE: 'Available',
    AWAY_TWIN: 'Away — Twin Active',
    DND_INTERCEPT: 'Do Not Disturb',
    NIGHT_SHIFT: 'Night Shift Mode',
    OFFLINE: 'Offline'
  };

  const badgeColor = statusColors[normStatus as keyof typeof statusColors] || statusColors.OFFLINE;
  const labelText = labels[normStatus as keyof typeof labels] || 'Offline';

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn(
        "rounded-full border border-white dark:border-zinc-950 flex items-center justify-center shrink-0 transition-all",
        sizeClasses[size],
        badgeColor
      )}>
        {normStatus === 'AWAY_TWIN' && <Sparkles size={6} className="text-white animate-pulse" />}
      </span>
      {showLabel && (
        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
          {labelText}
        </span>
      )}
    </div>
  );
};

interface UserAvatarWithPresenceProps {
  avatarUrl?: string;
  name?: string;
  status?: TwinPresenceStatus | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showPresence?: boolean;
  memberId?: string;
  userId?: string;
  enableProfileCard?: boolean;
}

export const UserAvatarWithPresence: React.FC<UserAvatarWithPresenceProps> = ({
  avatarUrl,
  name = 'User',
  status,
  size = 'sm',
  className,
  showPresence = true,
  memberId,
  userId,
  enableProfileCard = true
}) => {
  const { user } = useAuth();
  const platformCtx = usePlatform();
  const platformUser = platformCtx?.user;
  const profileCard = useUserProfileCard();
  const chatCtx = useOptionalChat();

  const { presenceStatus: myPresenceStatus } = useDigitalTwin();

  const isCurrentUser = Boolean(
    (userId && (userId === user?.id || userId === platformUser?.id || userId === platformUser?.memberId)) ||
    (memberId && (memberId === platformUser?.memberId || memberId === platformUser?.id || memberId === user?.id)) ||
    (platformUser?.firstName && name && name.toLowerCase().includes(platformUser.firstName.toLowerCase())) ||
    (user?.email && name && user.email.toLowerCase().includes(name.toLowerCase().split(' ')[0])) ||
    (user?.user_metadata?.full_name && name && user.user_metadata.full_name.toLowerCase().includes(name.toLowerCase()))
  );

  const resolvedMember = React.useMemo(() => {
    const membersList = platformCtx?.members || [];
    if (!membersList.length) return null;
    if (memberId) {
      const byId = membersList.find((m) => m.id === memberId || m.userId === memberId);
      if (byId) return byId;
    }
    if (userId) {
      const byUser = membersList.find((m) => m.userId === userId || m.id === userId);
      if (byUser) return byUser;
    }
    if (avatarUrl) {
      const byAvatar = membersList.find((m) => m.avatarUrl && m.avatarUrl === avatarUrl);
      if (byAvatar) return byAvatar;
    }
    if (name && name !== 'User') {
      const lower = name.toLowerCase();
      return membersList.find((m) => m.name?.toLowerCase() === lower) || null;
    }
    return null;
  }, [memberId, userId, platformCtx?.members, avatarUrl, name]);

  const targetProfileId = memberId || userId || resolvedMember?.id || (resolvedMember as any)?.userId;
  const canShowCard = Boolean(enableProfileCard && targetProfileId && profileCard);

  const liveChatPresence = React.useMemo(() => {
    if (!chatCtx?.userPresence) return null;
    const key = memberId || userId || targetProfileId;
    if (key && chatCtx.userPresence[key]) {
      return chatCtx.userPresence[key].presence;
    }
    if (name && name !== 'User') {
      const lower = name.toLowerCase();
      const match = Object.values(chatCtx.userPresence).find(
        (u) => u.name && u.name.toLowerCase() === lower
      );
      if (match?.presence) return match.presence;
    }
    return null;
  }, [chatCtx?.userPresence, memberId, userId, targetProfileId, name]);

  let finalStatus: TwinPresenceStatus = 'AVAILABLE';
  if (isCurrentUser) {
    finalStatus = (myPresenceStatus as TwinPresenceStatus) || 'AVAILABLE';
  } else if (liveChatPresence) {
    finalStatus = normalizePresenceStatus(liveChatPresence);
  } else if (status) {
    finalStatus = normalizePresenceStatus(status);
  } else if (resolvedMember) {
    const memStatus = (resolvedMember as any).presenceStatus || resolvedMember.status;
    finalStatus = normalizePresenceStatus(memStatus);
  } else {
    finalStatus = 'AVAILABLE';
  }

  const containerSizes = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const iconSizes = {
    xs: 10,
    sm: 14,
    md: 18,
    lg: 22
  };

  const badgeSizeMap: Record<string, 'xs' | 'sm' | 'md' | 'lg'> = {
    xs: 'xs',
    sm: 'sm',
    md: 'md',
    lg: 'lg'
  };

  return (
    <div
      className={cn("relative inline-block shrink-0", canShowCard && "cursor-pointer", className)}
      onMouseEnter={
        canShowCard
          ? (e) =>
              profileCard!.scheduleOpen(targetProfileId!, e.currentTarget, {
                name,
                avatarUrl,
                status: finalStatus
              })
          : undefined
      }
      onMouseLeave={canShowCard ? () => profileCard!.scheduleClose() : undefined}
    >
      <div className={cn(
        "rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center overflow-hidden font-bold text-indigo-600 dark:text-indigo-400",
        containerSizes[size]
      )}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : name ? (
          <span>{name.charAt(0).toUpperCase()}</span>
        ) : (
          <UserIcon size={iconSizes[size]} />
        )}
      </div>

      {showPresence && (
        <UserPresenceBadge
          status={finalStatus}
          size={badgeSizeMap[size]}
          className="absolute -bottom-0.5 -right-0.5 z-10"
        />
      )}
    </div>
  );
};

interface UserProfileTriggerProps {
  memberId?: string;
  userId?: string;
  name?: string;
  avatarUrl?: string;
  status?: string;
  className?: string;
  children: React.ReactNode;
}

export const UserProfileTrigger: React.FC<UserProfileTriggerProps> = ({
  memberId,
  userId,
  name,
  avatarUrl,
  status,
  className,
  children
}) => {
  const profileCard = useUserProfileCard();
  const targetId = memberId || userId;
  const enabled = Boolean(targetId && profileCard);

  return (
    <div
      className={cn(enabled && 'cursor-pointer', className)}
      onMouseEnter={
        enabled
          ? (e) => profileCard!.scheduleOpen(targetId!, e.currentTarget, { name, avatarUrl, status })
          : undefined
      }
      onMouseLeave={enabled ? () => profileCard!.scheduleClose() : undefined}
    >
      {children}
    </div>
  );
};

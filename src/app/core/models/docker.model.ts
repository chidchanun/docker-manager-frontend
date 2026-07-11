export interface DockerInfoResponse {
  connected: boolean;

  name: string;
  platform: string;
  server_version: string;
  api_version: string;
  minimum_api_version: string;

  operating_system: string;
  os_type: string;
  architecture: string;
  kernel_version: string;

  cpus: number;
  memory_bytes: number;
  memory_human: string;

  containers: number;
  containers_running: number;
  containers_paused: number;
  containers_stopped: number;
  images: number;

  storage_driver: string;
  logging_driver: string;
  docker_root_dir: string;
  default_runtime: string;
}

export interface ContainerPort {
  host_ip?: string;
  container_port: number;
  host_port?: number;
  protocol: string;
}

export interface ContainerResponse {
  id: string;
  short_id: string;
  name: string;

  image: string;
  image_id: string;
  command: string;

  state: string;
  status: string;
  health?: string;

  created_at: string;

  ports: ContainerPort[];
  networks: string[];
  network_mode: string;

  compose_project?: string;
  compose_service?: string;

  mount_count: number;
}

export interface ContainerListResponse {
  total: number;
  items: ContainerResponse[];
}

export interface ContainerActionResponse {
  success: boolean;
  action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill' | 'remove';

  container_id: string;
  name: string;
  state: string;

  changed: boolean;
  timeout_seconds?: number;

  message: string;
  performed_at: string;
}

export interface ContainerStats {
  id: string;
  name: string;
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
  memory_percent: number;
  disk_read: number;
  disk_write: number;
  network_rx: number;
  network_tx: number;
}

export interface ContainerStatsListResponse {
  collected_at: string;
  total: ContainerStats;
  items: ContainerStats[];
}

export interface ContainerLogsResponse {
  container_id: string;
  name: string;
  tail: number;
  timestamps: boolean;
  truncated: boolean;
  logs: string;
}

export interface ContainerDetailResponse {
  id: string; short_id: string; name: string; created_at: string; image_id: string;
  path: string; arguments: string[]; platform: string; driver: string; restart_count: number;
  state: { status: string; running: boolean; health?: string; pid: number; exit_code: number; started_at?: string; finished_at?: string; error?: string };
  config: { image: string; hostname: string; user?: string; working_dir?: string; entrypoint: string[]; command: string[]; tty: boolean };
  host_config: { network_mode: string; log_driver: string; restart_policy: string; auto_remove: boolean; privileged: boolean; readonly_root_fs: boolean; shared_memory_bytes: number };
  ports: Array<{ container_port: number; protocol: string; host_ip?: string; host_port?: string }>;
  networks: Array<{ name: string; ip_address?: string; gateway?: string; mac_address?: string }>;
  mounts: Array<{ type: string; source: string; destination: string; read_write: boolean }>;
  compose: { project?: string; service?: string; config_file?: string; working_dir?: string };
}

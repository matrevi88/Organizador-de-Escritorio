import { execFile } from 'child_process'

interface ExecResult {
  stdout: string
  stderr: string
  status: number
}

export function execFileNoThrow(cmd: string, args: string[], timeoutMs = 4000): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(cmd, args, { encoding: 'utf8', timeout: timeoutMs }, (err, stdout, stderr) => {
      resolve({
        stdout: (stdout ?? '').trim(),
        stderr: (stderr ?? '').trim(),
        status: err?.code !== undefined ? (typeof err.code === 'number' ? err.code : 1) : 0
      })
    })
  })
}

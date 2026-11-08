package com.javadaba.contexts.officium.application;

/**
 * The one command that gives a machine its heartbeat token (JAVA-675, contract §4.2), run by the
 * agent from the MCP's answer. POSIX sh and curl, like the hooks that read the file it writes
 * (the market's {@code officium-heartbeat.sh}): a machine that can run those can run this.
 *
 * <ul>
 *   <li>An existing token that a beat still accepts is kept, and the code is left to lapse unspent:
 *       running the setup again never multiplies devices.</li>
 *   <li>Otherwise the code is redeemed under {@code umask 077} into a temporary file that is then
 *       moved over the token file, mode 0600: the token goes from the response to the disk, and
 *       nothing prints it.</li>
 *   <li>The device is named the way the hooks name the machine ({@code OFFICIUM_MACHINE}, else
 *       {@code COMPUTERNAME}, else {@code hostname}), without the quotes and backslashes the hooks
 *       strip too.</li>
 * </ul>
 */
final class SetupCommand {

    private static final String TEMPLATE = """
            (umask 077; d="$HOME/.config/officium"; f="$d/heartbeat-token"; \
            m=$(printf %s "${OFFICIUM_MACHINE:-${COMPUTERNAME:-$(hostname)}}" | tr -d '"\\\\'); m="${m:-unnamed}"; \
            mkdir -p "$d" || exit 1; \
            if [ -s "$f" ] && curl -fs -o /dev/null -H "Authorization: Bearer $(tr -d '[:space:]' < "$f")" \
            -H 'Content-Type: application/json' -d "{\\"machine\\":\\"$m\\"}" '{BASE}/officium/v1/heartbeat'; \
            then echo "Officium heartbeat: kept the valid token already in $f"; \
            elif curl -fsS -H 'Content-Type: application/json' -H 'Accept: text/plain' \
            -d "{\\"code\\":\\"{CODE}\\",\\"machine\\":\\"$m\\"}" -o "$f.tmp" '{BASE}/officium/v1/heartbeat/tokens/redeem' \
            && mv -f "$f.tmp" "$f" && chmod 600 "$f"; \
            then echo "Officium heartbeat: token for $m saved to $f"; \
            else rm -f "$f.tmp"; echo "Officium heartbeat: the setup code was refused (codes work once, for 10 \
            minutes); ask Officium for a new one" >&2; exit 1; fi)""";

    private SetupCommand() {
    }

    static String of(String apiBase, String code) {
        return TEMPLATE.replace("{BASE}", apiBase).replace("{CODE}", code);
    }
}

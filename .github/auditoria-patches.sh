#!/bin/sh
# Auditoria de patches — RODAR ANTES DE TROCAR QUALQUER IMAGEM.
#
# Por que existe: em 25/07 o patch do comentário→direct se perdeu num build e
# ficou 3 dias fora do ar sem erro nenhum no log. Ver patch-03-sendprivatereply.md.
#
# 🔑 REGRA DA ASSINATURA: usar TEXTO que sobrevive ao build — mensagem de log,
# string comparada, rótulo de interface. NUNCA nome de função ou de variável: o
# bundler renomeia (`sendInstagramPrivateReply` do código-fonte vira
# `sendPrivateReply$1` no bundle) e a auditoria reprova imagem que está boa.
# Também não usar comentário: comentário some no build, e marcador de patch
# cirúrgico não existe na imagem compilada a partir do fork. As duas primeiras
# versões deste script erraram exatamente assim.
#
# Uso:  sh auditoria.sh                      → o que está rodando agora
#       sh auditoria.sh chatbotx-worker:v5   → uma imagem específica
#       sh auditoria.sh ghcr.io/jhmichelazzo/chatbotx-builder:abdal

FALHAS=0
WD=/app/apps/worker/dist
BD=/app/apps/builder/.next

# O padrão vai por variável de ambiente (-e PAT=) para não brigar com as próprias
# aspas do padrão. `-e` PRECISA vir antes do nome da imagem/container: depois
# dele o Docker trata como argumento do comando, não como opção.
busca() { # <modo> <alvo> <padrão> <caminho>
  case "$1" in
    run)
      docker run --rm -e PAT="$3" --entrypoint sh "$2" \
        -c 'grep -rqF -- "$PAT" '"$4" 2>/dev/null
      ;;
    exec)
      docker exec -e PAT="$3" "$2" \
        sh -c 'grep -rqF -- "$PAT" '"$4" 2>/dev/null
      ;;
  esac
}

checa() { # <descrição> <modo> <alvo> <padrão> <caminho>
  if busca "$2" "$3" "$4" "$5"; then
    printf "  \033[32m✔\033[0m %s\n" "$1"
  else
    printf "  \033[31m✘ FALTANDO\033[0m %s\n" "$1"
    FALHAS=$((FALHAS + 1))
  fi
}

audita_worker() { # <rótulo> <modo> <alvo>
  echo "WORKER: $1"
  checa "patch 1 — comentário vira direct no Instagram" "$2" "$3" \
    'channelType === "instagram") await sendPrivateReply' "$WD"
  checa "patch 2 — fallback de campos do perfil do contato" "$2" "$3" \
    'retrying without profile_pic' "$WD"
}

audita_builder() { # <rótulo> <modo> <alvo>
  echo "BUILDER: $1"
  checa "patch 3 — conta de Criador (MEDIA_CREATOR) conecta" "$2" "$3" \
    'MEDIA_CREATOR' "$BD/server/chunks"
  checa "patch 4 — painel traduzido em pt-BR" "$2" "$3" \
    'Espaço de trabalho' "$BD"
  checa "patch 5 — menu lateral Como usar" "$2" "$3" \
    'comousar.abdaldigital.com.br' "$BD/static/chunks"
}

echo "=================================================="
if [ -n "$1" ]; then
  case "$1" in
    *worker*)  audita_worker  "$1" run "$1" ;;
    *builder*) audita_builder "$1" run "$1" ;;
    *) echo "informe uma imagem de worker ou builder"; exit 2 ;;
  esac
else
  audita_worker \
    "$(docker inspect --format '{{.Config.Image}}' chatbotx-worker-1)" \
    exec chatbotx-worker-1
  echo
  audita_builder \
    "$(docker inspect --format '{{.Config.Image}}' chatbotx-builder-1)" \
    exec chatbotx-builder-1
fi
echo "=================================================="
if [ "$FALHAS" -eq 0 ]; then
  echo "TUDO NO LUGAR"
else
  echo "$FALHAS patch(es) faltando — não trocar a imagem assim"
fi
exit $FALHAS

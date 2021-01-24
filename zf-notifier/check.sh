#!/usr/bin/env bash

FILEPATH="./temp/zf"
TEMP_PID="./temp/zfpid"
ALL_PID="./temp/zfallpid"
WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/29137695-aed9-44b4-a27b-ef8b967973e7"
# WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/97d4693e-a5e0-4684-a7ab-e7d4b3b87f35"

export PATH="/usr/local/bin:$PATH"

wget -O $FILEPATH "https://www.zfrontier.com/shop/cate/140,25"

if [ ! -f "$FILEPATH" ]; then
    exit 1
fi

PRODUCT_LIST=$(rg "var data" $FILEPATH | awk 'BEGIN{FS="var data = "}{print $2}' | awk 'BEGIN{FS=";"}{print $1}' | jq '.mList')
echo $PRODUCT_LIST | jq '.[].id' > $TEMP_PID
if [ ! -f "$ALL_PID" ]; then
    cat $TEMP_PID >> $ALL_PID
fi
DIFF_PID=$(grep -Fxvf $ALL_PID $TEMP_PID)
echo $DIFF_PID
set -f
apid=(${DIFF_PID// /})
for i in "${!apid[@]}"
do
    PID="${apid[i]}"
    PROD=$(echo $PRODUCT_LIST | jq '.[] | select(.id=='$PID')')
    NAME=$(echo $PROD | jq '.name' | awk 'BEGIN{FS="\""}{print $2}')
    HREF=$(echo $PROD | jq '.href' | awk 'BEGIN{FS="\""}{print $2}')

    curl -X POST \
        $WEBHOOK \
        -H 'Content-Type: application/json' \
        -d "{\"msg_type\": \"text\",\"content\": {\"text\": \"发现ZF新预售 $NAME https://www.zfrontier.com/app$HREF\"}}"
    echo $PID >> $ALL_PID
done

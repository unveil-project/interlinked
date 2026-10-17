Hi @zou3519 , May I know the full steps to run this from a clean conda env?
The steps that I did was as the following. Is there anything I missed?
```
conda create -n py37 python=3.7
conda activate py37
python -m pip install mypy==0.812
git clone https://github.com/pytorch/pytorch.git
cd pytorch
mypy --config-file mypy.ini
```

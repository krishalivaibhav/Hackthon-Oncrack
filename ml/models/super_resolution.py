import torch
import torch.nn as nn
import torch.nn.functional as F

class SuperResolutionModel(nn.Module):
    def __init__(self, scale_factor=4):
        super(SuperResolutionModel, self).__init__()
        self.scale_factor = scale_factor
        
        # Initial feature extraction
        self.conv1 = nn.Conv2d(1, 64, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(64, 64, kernel_size=3, padding=1)
        
        # Residual blocks
        self.res_blocks = nn.ModuleList([
            nn.Sequential(
                nn.Conv2d(64, 64, kernel_size=3, padding=1),
                nn.BatchNorm2d(64),
                nn.ReLU(inplace=True),
                nn.Conv2d(64, 64, kernel_size=3, padding=1),
                nn.BatchNorm2d(64)
            ) for _ in range(16)
        ])
        
        # Upsampling layers
        self.upsample = nn.Sequential(
            nn.Conv2d(64, 256, kernel_size=3, padding=1),
            nn.PixelShuffle(2),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 256, kernel_size=3, padding=1),
            nn.PixelShuffle(2),
            nn.ReLU(inplace=True)
        )
        
        # Final convolution
        self.conv3 = nn.Conv2d(64, 1, kernel_size=3, padding=1)
        
    def forward(self, x):
        # Initial feature extraction
        x = F.relu(self.conv1(x))
        x = F.relu(self.conv2(x))
        
        # Residual blocks
        identity = x
        for res_block in self.res_blocks:
            out = res_block(x)
            x = F.relu(x + out)
        
        # Upsampling
        x = self.upsample(x)
        
        # Final convolution
        x = self.conv3(x)
        
        return x

def create_model(device='cuda' if torch.cuda.is_available() else 'cpu'):
    model = SuperResolutionModel()
    model = model.to(device)
    return model

def train_model(model, train_loader, criterion, optimizer, device, num_epochs=100):
    model.train()
    for epoch in range(num_epochs):
        running_loss = 0.0
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
        
        print(f'Epoch {epoch+1}/{num_epochs}, Loss: {running_loss/len(train_loader):.4f}')
    
    return model

def predict(model, input_data, device):
    model.eval()
    with torch.no_grad():
        input_data = input_data.to(device)
        output = model(input_data)
    return output 